import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inferenceModel, localModel, cloudModel, user, message } from '$lib/server/db/schema';
import { GoogleAuth } from 'google-auth-library';

async function callCloudRun({
    cloudUrl,
    cloudKeyJsonString,
    path,
    method,
    body = null
}) {
    try {
        const credentials = JSON.parse(cloudKeyJsonString);

        // 1. Instantiate GoogleAuth with credentials.
        //    No need for clientOptions.subject when authenticating as the service account itself.
        const auth = new GoogleAuth({
            credentials,
        });

        // 2. Get the ID token client for the Cloud Run service URL (audience).
        const client = await auth.getIdTokenClient(cloudUrl);

        // 3. Get the headers, which will include the Authorization: Bearer <ID_TOKEN> header.
        const headers = await client.getRequestHeaders();

        // 4. Construct the full URL.
        const fullUrl = `${cloudUrl}${path}`;

        // 5. Make the fetch request.
        const response = await fetch(fullUrl, {
            method: method,
            headers: {
                ...headers, // Include Authorization header
                'Content-Type': 'application/json', // Assuming your endpoint expects JSON
            },
            body: body ? JSON.stringify(body) : undefined, // Stringify body if it exists
        });

        // Check if the response indicates an error (like 403)
        if (!response.ok) {
            const errorBody = await response.text(); // or response.json() if it returns JSON errors
            console.error(`Cloud Run request failed: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Cloud Run request failed: ${response.status} ${response.statusText}`);
        }

        // Return the response object to be handled by the caller
        return response;

    } catch (error) {
        console.error('Error making Cloud Run request:', error);
        throw error; // Re-throw the error to be caught by the action handler
    }
}

export const load = async (event) => {
    const authUser = event.locals.user;
    if (!authUser) {
        redirect(302, '/login');
    }

    const allModels = await db.select().from(inferenceModel);

    const userLocalModels = await db.select()
        .from(localModel)
        .where(eq(localModel.userId, authUser.id));

    const userCloudModels = await db.select()
        .from(cloudModel)
        .where(eq(cloudModel.userId, authUser.id));

    const modelsWithStatus = allModels.map(model => ({
        ...model,
        localEnabled: userLocalModels.some(lm => lm.modelId === model.id),
        cloudEnabled: userCloudModels.some(cm => cm.modelId === model.id)
    }));

    const modelsGroupedByName = modelsWithStatus.reduce((accumulator, currentModel) => {
        const groupName = currentModel.name;
        const existingGroup = accumulator.find(group => group.modelName === groupName);

        if (!existingGroup) {
            accumulator.push({ modelName: groupName, models: [currentModel] });
        } else {
            existingGroup.models.push(currentModel);
        }
        return accumulator;
    }, []);
    return { models: modelsGroupedByName };
};

export const actions = {
    "toggle-model-local": async (event) => {
        const authUser = event.locals.user;
        if (!authUser) redirect(302, '/login');
        const formData = await event.request.formData();
        const modelId = Number(formData.get('modelId'));

        if (isNaN(modelId)) {
            return fail(400, { message: 'Invalid request' });
        }

        try {
            const userId = authUser.id;
            const existing = await db.select()
                .from(localModel)
                .where(and(
                    eq(localModel.userId, userId),
                    eq(localModel.modelId, modelId)
                ));

            if (existing.length) {
                const [wantedModel] = await db.select()
                    .from(inferenceModel)
                    .where(eq(inferenceModel.id, modelId));

                const responseToDelete = await fetch(`${env.OLLAMA_URL}/api/delete`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: wantedModel.ollamaName })
                });

                await db.delete(localModel)
                    .where(and(
                        eq(localModel.userId, userId),
                        eq(localModel.modelId, modelId)
                    ));
                return { success: true, message: 'Model succesfully removed from your machine.' };

            } else {
                const [wantedModel] = await db.select()
                    .from(inferenceModel)
                    .where(eq(inferenceModel.id, modelId));

                const response = await fetch(`${env.OLLAMA_URL}/api/pull`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: wantedModel.ollamaName })
                });

                const reader = response.body.getReader();
                while (true) {
                    const { done } = await reader.read();
                    if (done) break;
                }

                await db.insert(localModel).values({ userId, modelId });

                return {
                    success: true,
                    message: 'Model succesfully added from your machine.'
                };
            }
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Failed to update model status' });
        }
    },

    "toggle-model-cloud": async (event) => {
        const authUser = event.locals.user;
        if (!authUser) redirect(302, '/login');
        const formData = await event.request.formData();
        const modelId = Number(formData.get('modelId'));

        if (isNaN(modelId)) {
            return fail(400, { message: 'Invalid request' });
        }

        try {
            const userId = authUser.id;
            const existing = await db.select()
                .from(cloudModel)
                .where(and(
                    eq(cloudModel.userId, userId),
                    eq(cloudModel.modelId, modelId)
                ));

            if (existing.length) {
                const [userData] = await db.select()
                .from(user)
                .where(eq(user.id, userId));

                const [wantedModel] = await db.select()
                    .from(inferenceModel)
                    .where(eq(inferenceModel.id, modelId));

                const serviceAccount = JSON.parse(userData.cloudKey);

                const { GoogleAuth } = await import('google-auth-library');
                const auth = new GoogleAuth({
                    credentials: JSON.parse(userData.cloudKey),
                    clientOptions: {
                        subject: userData.cloudKey.client_email // Add service account email
                    }
                });
        
                const client = await auth.getIdTokenClient(userData.cloudUrl);
                const headers = await client.getRequestHeaders();

                const responseToDelete = await fetch(`${userData.cloudUrl}/api/delete`, {
                    method: 'DELETE',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: wantedModel.ollamaName
                    })
                });

                console.log('Response:', responseToDelete);

                await db.delete(cloudModel)
                    .where(and(
                        eq(cloudModel.userId, userId),
                        eq(cloudModel.modelId, modelId)
                    ));
                return { success: true, message: 'Model succesfully removed from your machine.' };

            } else {
                const [userData] = await db.select()
                    .from(user)
                    .where(eq(user.id, userId));

                const [wantedModel] = await db.select()
                    .from(inferenceModel)
                    .where(eq(inferenceModel.id, modelId));

                
                const auth = new GoogleAuth({
                    credentials: JSON.parse(userData.cloudKey),
                    clientOptions: {
                        subject: userData.cloudKey.client_email // Add service account email
                    }
                });
        

                const client = await auth.getIdTokenClient(userData.cloudUrl);
                const headers = await client.getRequestHeaders();

                const responseToDelete = await fetch(`${userData.cloudUrl}/api/pull`, {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: wantedModel.ollamaName
                    })
                });

                console.log('Response:', responseToDelete);

                await db.insert(cloudModel).values({ userId, modelId });

                return {
                    success: true,
                    message: 'Model succesfully added from your machine.'
                };
            }
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Failed to update model status' });
        }
    },

    "update-cloud-info": async (event) => {
        const authUser = event.locals.user;
        if (!authUser) redirect(302, '/login');
        const formData = await event.request.formData();

        try {
            const cloudUrl = formData.get('cloud_url');
            const cloudKeyFile = formData.get('cloud_key');

            if (!cloudUrl || !cloudKeyFile || !(cloudKeyFile instanceof File)) {
                return fail(400, { message: 'Invalid request - missing required fields' });
            }

            const jsonContent = await cloudKeyFile.text();
            const cloudKeyData = JSON.parse(jsonContent);

            if (!cloudKeyData) {
                return fail(400, { message: 'Invalid JSON format - missing required fields' });
            }

            const userId = authUser.id;
            await db.update(user)
                .set({
                    cloudUrl: cloudUrl,
                    cloudKey: jsonContent
                })
                .where(eq(user.id, userId));

            return {
                success: true,
                message: 'Cloud configuration updated successfully'
            };
        } catch (error) {
            console.error('Cloud config update error:', error);
            return fail(500, {
                message: error instanceof SyntaxError
                    ? 'Invalid JSON file'
                    : 'Failed to update cloud configuration'
            });
        }
    }
};