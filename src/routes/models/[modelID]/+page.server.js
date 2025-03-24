import { db } from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { model, tag, modelTag } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    },
    download: async (event) => {
        const [record] = await db.select({
            filePath: model.filePath,
            downloads: model.downloads
        }).from(model)
        .where(eq(model.id, event.params.modelID));

        if (!record?.filePath) return fail(404, { error: 'File not found' });

        await db.update(model)
            .set({ downloads: record.downloads + 1 })
            .where(eq(model.id, event.params.modelID));

        const filePath = path.join(process.cwd(), 'static/models', record.filePath);
        console.log(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');
        return { 
            success: true,
            fileName: record.filePath,
            mimeType: 'application/octet-stream',
            data: base64Data
        };
    }
};

export const load = async ({ params }) => {
    try {
        const fetchedModel = await db.select().from(model).where(eq(model.id, params.modelID));
        const fetchedTagIDs = await db.select().from(modelTag).where(eq(modelTag.modelId, params.modelID));
        const fetchedTags = await db.select().from(tag).where(inArray(tag.id, fetchedTagIDs.map(tag => tag.tagId)));
        fetchedModel[0].tags = fetchedTags;
        if (fetchedModel.length === 0) {
            return fail(404, "Model not found");
        }
        return { model: fetchedModel[0] };
    }
    catch (error) {
        return {
            model: [],
            error: 'Failed to fetch model: ' + error.message
        };
    }
};