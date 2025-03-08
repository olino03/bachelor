import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { dataset, tag, datasetTag } from '$lib/server/db/schema';

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
        const allDatasets = await db.select().from(dataset);
        const allTags = await db.select().from(tag);
        const datasetTagRelation = await db.select().from(datasetTag);
        
        const joinedDatasets = allDatasets.map(dataset => ({
            ...dataset,
            tags: datasetTagRelation
                .filter(relation => relation.datasetId === dataset.id)
                .map(relation => allTags.find(tag => tag.id === relation.tagId))
                .filter(Boolean) // Remove any potential undefined values
        }));
        return {datasets: joinedDatasets, tags: allTags};
    } catch (error) {
        return {
            datasets: [],
            error: 'Failed to fetch datasets: ' + error.message
        };
    }
}