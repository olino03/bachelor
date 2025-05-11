import { redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inferenceModel, localModel, cloudModel, user } from '$lib/server/db/schema';
import { localModel, cloudModel } from '$lib/server/db/schema';

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
    const modelsWithStatusSorted = modelsGroupedByName;
    return { modelsWithStatusSorted };
};

export const actions = {
    update: async (event) => {
        
    },
    
    toggleModel: async (event) => {
        const user = event.locals.user;
        if (!user) redirect(302, '/login');

        const formData = await event.request.formData();
        const modelId = Number(formData.get('modelId'));
        const type = formData.get('type');

        if (isNaN(modelId) || !['local', 'cloud'].includes(type)) {
            return fail(400, { message: 'Invalid request' });
        }

        try {
            const userId = user.id;
            
            if (type === 'local') {
                const existing = await db.select()
                    .from(localModel)
                    .where(and(
                        eq(localModel.userId, userId),
                        eq(localModel.modelId, modelId)
                    ));

                if (existing.length) {
                    await db.delete(localModel)
                        .where(and(
                            eq(localModel.userId, userId),
                            eq(localModel.modelId, modelId)
                        ));
                } else {
                    await db.insert(localModel)
                        .values({ userId, modelId });
                }
            } else {
                // Check cloud configuration exists
                const [userData] = await db.select()
                    .from(table.user)
                    .where(eq(table.user.id, userId));

                if (!userData.cloudUrl || !userData.cloudKey) {
                    return fail(400, { message: 'Cloud configuration required' });
                }

                const existing = await db.select()
                    .from(cloudModel)
                    .where(and(
                        eq(cloudModel.userId, userId),
                        eq(cloudModel.modelId, modelId)
                    ));

                if (existing.length) {
                    await db.delete(cloudModel)
                        .where(and(
                            eq(cloudModel.userId, userId),
                            eq(cloudModel.modelId, modelId)
                        ));
                } else {
                    await db.insert(cloudModel)
                        .values({ userId, modelId });
                }
            }

            return { success: true };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Failed to update model status' });
        }
    }
};