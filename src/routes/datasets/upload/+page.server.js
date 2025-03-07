import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { dataset, tag, datasetTag } from '$lib/server/db/schema';
import path from 'path';
import fs from 'fs';


const UPLOADS_DIR = path.resolve('static', 'datasets');

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

        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        
        const userID = formData.get('userID');
        const name = formData.get('name');
        const displayDescription = formData.get('displayDescription');
        const description = formData.get('description');
        const file = formData.get('file');
        let tags = formData.get('tags');

        if (!userID) {
            return fail(401, {
                error: 'Unauthorized'
            });
        }

        if (!name || !displayDescription || !description || !file) {
            return fail(400, {
                error: 'Missing required fields'
            });
        }

        tags = tags ? tags.split(',').map((tag) => tag.trim()) : [];
        const uniqueFileName = `${userID}_${name}_${file.ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFileName);

        if (fs.existsSync(filePath)) {
            return fail(409, {
                error: 'File already exists! Please rename your file or choose another.'
            });
        }
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, fileBuffer);

        await db.transaction(async (tx) => {
            const [lastEntry] = await db.insert(dataset).values({
                userId: userID,
                name,
                displayDescription,
                description,
                filePath
            }).returning({id: dataset.id });

            if (tags.length > 0) {
                await db.insert(datasetTag).values(
                    tags.map(tagId => ({
                        datasetId: lastEntry.id,
                        tagId: tagId
                    }))
                );
            }
        });

        return {
            success: 'Dataset uploaded successfully!'
        };


        // try {
        //     const formData = await request.formData();

        //     if (!fs.existsSync(UPLOADS_DIR)) {
        //         fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        //     }

        //     const userID = formData.get('userID');
        //     const name = formData.get('name');
        //     const displayDescription = formData.get('Description');
        //     const description = formData.get('description');
        //     const file = formData.get('file');
        //     let tags = formData.get('tags');

        //     if (!userID) {
        //         return fail(401, {
        //             error: 'Unauthorized'
        //         });
        //     }

        //     if (!name || !displayDescription || !description || !file) {
        //         return fail(400, {
        //             error: 'Missing required fields'
        //         });
        //     }

        //     tags = tags ? tags.split(',').map((tag) => tag.trim()) : [];

        //     const uniqueFileName = `${userID}_${file.name}`;
        //     const filePath = path.join(UPLOADS_DIR, uniqueFileName);

        //     if (fs.existsSync(filePath)) {
        //         return fail(409, {
        //             error: 'File already exists! Please rename your file or choose another.'
        //         });
        //     }

        //     const fileBuffer = Buffer.from(await file.arrayBuffer());
        //     fs.writeFileSync(filePath, fileBuffer);

        //     const [datasetID] = await tx.insert(dataset).values({
        //         userId: userID,
        //         name,
        //         displayDescription,
        //         description,
        //         filePath
        //     }).returning({ id: dataset.id });

        //     if (tags.length > 0) {
        //         await tx.insert(datasetTag).values(
        //             tags.map(tagId => ({
        //                 datasetId: insertedDataset.id,
        //                 tagId: tagId
        //             }))
        //         );
        //     }

        //     return {
        //         success: 'Dataset uploaded successfully!'
        //     };
        // } catch (error) {
        //     return fail(500, {
        //         error: error.message || 'Failed to upload dataset'
        //     });
        // }
    }
};