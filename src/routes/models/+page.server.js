import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { model, tag, modelTag } from '$lib/server/db/schema';

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    }
};

export async function load() {
    try {
        const allModels = await db.select().from(model);
        const allTags = await db.select().from(tag);
        const modelTagRelation = await db.select().from(modelTag);

        const joinedModels = allModels.map(model => ({
            ...model,
            tags: modelTagRelation
                .filter(relation => relation.modelId === model.id)
                .map(relation => allTags.find(tag => tag.id === relation.tagId))
                .filter(Boolean) 
        }));
        return { models: joinedModels, tags: allTags };
    } catch (error) {
        return {
            models: [],
            error: 'Failed to fetch models: ' + error.message
        };
    }
}