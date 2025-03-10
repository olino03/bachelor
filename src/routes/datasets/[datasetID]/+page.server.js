import { db } from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { dataset, tag, datasetTag } from '$lib/server/db/schema';
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
            filePath: dataset.filePath,
            downloads: dataset.downloads
        }).from(dataset)
        .where(eq(dataset.id, event.params.datasetID));

        if (!record?.filePath) return fail(404, { error: 'File not found' });

        await db.update(dataset)
            .set({ downloads: record.downloads + 1 })
            .where(eq(dataset.id, event.params.datasetID));

        const filePath = path.join(process.cwd(), 'static/datasets', record.filePath);
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
        const fetchedDataset = await db.select().from(dataset).where(eq(dataset.id, params.datasetID));
        const fetchedTagIDs = await db.select().from(datasetTag).where(eq(datasetTag.datasetId, params.datasetID));
        const fetchedTags = await db.select().from(tag).where(inArray(tag.id, fetchedTagIDs.map(tag => tag.tagId)));
        fetchedDataset[0].tags = fetchedTags;
        if (fetchedDataset.length === 0) {
            return fail(404, "Dataset not found");
        }
        return { dataset: fetchedDataset[0], datasetID: params.datasetID };
    }
    catch (error) {
        return {
            dataset: [],
            error: 'Failed to fetch datasets: ' + error.message
        };
    }
};