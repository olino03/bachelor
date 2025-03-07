import * as auth from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { dataset, tag } from '$lib/server/db/schema';

export async function load() {
    try {
        const allTags = await db.select().from(tag);
        return { tags: allTags };
    } catch (error) {
        return {
            tags: [],
            error: 'Failed to fetch datasets: ' + error.message
        };
    }
}

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    },
    upload: async ({ request }) => {
        const formData = await request.formData();
        const name = formData.get('name');
        const username = formData.get('username');
        const shortDescription = formData.get('shortDescription');
        const description = formData.get('description');
        const tags = formData.get('tags');


        if (!name || !file) {
            return fail(400, {
                error: 'Name and file are required fields'
            });
        }

        try {
            // Process file upload here
            // Example: await processUpload(file);

            return {
                success: 'Dataset uploaded successfully!'
            };
        } catch (error) {
            return fail(500, {
                error: error.message || 'Failed to upload dataset'
            });
        }
    }
};