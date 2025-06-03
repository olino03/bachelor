import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inferenceModel, localModel, cloudModel, user, message, customLocalModel, customCloudModel, model } from '$lib/server/db/schema';
import { callCloudRun } from '$lib';

export const load = async (event) => {
    const authUser = event.locals.user;
    if (!authUser) {
        redirect(302, '/login');
    }

    const allModels = await db.select().from(inferenceModel);

    const customLocalModels = await db.select({modelName: customLocalModel.modelName})
        .from(customLocalModel)
        .where(eq(customLocalModel.userId, authUser.id));

    const customCloudModels = await db.select({modelName: customCloudModel.modelName})
        .from(customCloudModel)
        .where(eq(customCloudModel.userId, authUser.id));

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
    return { customModels: {local: customLocalModels, cloud: customCloudModels} ,models: modelsGroupedByName };
};

export const actions = {
    "delete-custom-model-local": async (event) => {
        const authUser = event.locals.user;
        if (!authUser) redirect(302, '/login');
        const formData = await event.request.formData();
        const modelName = formData.get('modelName');
        if (!modelName || typeof modelName !== 'string') {
            return fail(400, { message: 'Invalid request - model name is required' });
        }
        try {
            const response = await fetch(`${env.OLLAMA_URL}/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName })
            });

            if (!response.ok) {
                console.error('Failed to delete model from Ollama:', response.statusText);
                return fail(500, { message: 'Failed to delete model from Ollama' });
            }

            const userId = authUser.id;
            const existing = await db.select()
                .from(customLocalModel)
                .where(and(
                    eq(customLocalModel.userId, userId),
                    eq(customLocalModel.modelName, modelName)
                ));

            if (existing.length) {
                await db.delete(customLocalModel)
                    .where(and(
                        eq(customLocalModel.userId, userId),
                        eq(customLocalModel.modelName, modelName)
                    ));
                return { success: true, message: 'Custom model successfully deleted.' };
            } else {
                return fail(404, { message: 'Custom model not found.' });
            }
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Failed to delete custom model' });
        }
    },
    "delete-custom-model-cloud": async (event) => {
        const authUser = event.locals.user;
        if (!authUser) redirect(302, '/login');
        const formData = await event.request.formData();
        const modelName = formData.get('modelName');
        if (!modelName || typeof modelName !== 'string') {
            return fail(400, { message: 'Invalid request - model name is required' });
        }
        try {
            const [userData] = await db.select()
                .from(user)
                .where(eq(user.id, userId));

            const response = await callCloudRun({
                cloudUrl: userData.cloudUrl,
                cloudKeyJsonString: userData.cloudKey,
                path: '/api/delete', 
                method: 'DELETE',
                body: { name: wantedModel.ollamaName }
            });

            if (!response.ok) {
                console.error('Failed to delete model from Ollama:', response.statusText);
                return fail(500, { message: 'Failed to delete model from Ollama' });
            }

            const existing = await db.select()
                .from(customCloudModel)
                .where(and(
                    eq(customCloudModel.authUser.id, userId),
                    eq(customCloudModel.modelName, modelName)
                ));

            if (existing.length) {
                await db.delete(customCloudModel)
                    .where(and(
                        eq(customCloudModel.authUser.id, userId),
                        eq(customCloudModel.modelName, modelName)
                    ));
                return { success: true, message: 'Custom model successfully deleted.' };
            } else {
                return fail(404, { message: 'Custom model not found.' });
            }
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Failed to delete custom model' });
        }
    },
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
            const [userData] = await db.select()
                .from(user)
                .where(eq(user.id, userId));

            if (!userData || !userData.cloudUrl || !userData.cloudKey) {
                 console.error("Missing cloud config for user:", userId);
                 return fail(400, { message: 'Cloud configuration (URL or Key) is missing for your account.' });
            }
            
            console.log("User data for cloud config loaded.");

            const [wantedModel] = await db.select()
                .from(inferenceModel)
                .where(eq(inferenceModel.id, modelId));

            if (!wantedModel) {
                 console.error("Model not found in DB:", modelId);
                 return fail(404, { message: 'Model not found.' });
            }
            console.log("Wanted model found:", wantedModel.ollamaName);


            const existing = await db.select()
                .from(cloudModel)
                .where(and(
                    eq(cloudModel.userId, userId),
                    eq(cloudModel.modelId, modelId)
                ));
            console.log(`Model ${wantedModel.name} ${existing.length ? 'exists' : 'does not exist'} in cloudModel for user ${userId}.`);


            if (existing.length) {
                console.log("Attempting to delete cloud model...");
                const responseToDelete = await callCloudRun({
                    cloudUrl: userData.cloudUrl,
                    cloudKeyJsonString: userData.cloudKey,
                    path: '/api/delete', 
                    method: 'DELETE',
                    body: { name: wantedModel.ollamaName }
                });
                console.log("Cloud Run delete call finished.");


                await db.delete(cloudModel)
                    .where(and(
                        eq(cloudModel.userId, userId),
                        eq(cloudModel.modelId, modelId)
                    ));
                console.log("Model removed from cloudModel DB table.");
                return { success: true, message: 'Model successfully removed from cloud.' };

            } else {
                 console.log("Attempting to add cloud model...");
                 const response = await callCloudRun({
                    cloudUrl: userData.cloudUrl,
                    cloudKeyJsonString: userData.cloudKey,
                    path: '/api/pull', 
                    method: 'POST',
                    body: { name: wantedModel.ollamaName }
                });
                console.log("Cloud Run pull call finished.");

                await db.insert(cloudModel).values({ userId, modelId });
                 console.log("Model added to cloudModel DB table.");


                return {
                    success: true,
                    message: 'Model successfully added to cloud.'
                };
            }
        } catch (error) {
            console.error('Cloud model toggle action error caught:', error);
            if (error.message.startsWith('Cloud Run request failed:')) {
                 return fail(500, { message: `Cloud service error: ${error.message}` });
            }
            return fail(500, { message: `An unexpected error occurred: ${error.message}` });
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