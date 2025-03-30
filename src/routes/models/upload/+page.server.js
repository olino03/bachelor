import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db/index';
import { fail, redirect } from '@sveltejs/kit';
import { model, tag, modelTag } from '$lib/server/db/schema';
import path from 'path';
import fs from 'fs';


const UPLOADS_DIR = path.resolve('static', 'models');

export async function load() {
    try {
        const allTags = await db.select().from(tag);
        return { tags: allTags };
    } catch (error) {
        return {
            tags: [],
            error: 'Failed to fetch tags: ' + error.message
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
        try {
            const formData = await request.formData();

            if (!fs.existsSync(UPLOADS_DIR)) {
                fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            }

            const username = formData.get('username');
            const name = formData.get('name');
            const displayDescription = formData.get('displayDescription');
            const description = formData.get('description');
            const file = formData.get('file');
            let tags = formData.get('tags');

            if (!username) {
                return fail(401, {
                    message: 'Unauthorized'
                });
            }

            if (!name || !displayDescription || !description || !file) {
                return fail(400, {
                    message: 'Missing required fields'
                });
            }

            tags = tags ? tags.split(',').map((tag) => tag.trim()) : [];
            const uniqueFileName = `${username}_${name}_${file.name}`;
            const filePath = path.join(UPLOADS_DIR, uniqueFileName);

            if (fs.existsSync(filePath)) {
                return fail(409, {
                    message: 'File already exists! Please rename your file or choose another.'
                });
            }

            const fileBuffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(filePath, fileBuffer);

            await db.transaction(async (tx) => {
                const [lastEntry] = await db.insert(model).values({
                    uploadedBy: username,
                    name,
                    displayDescription,
                    description,
                    filePath: uniqueFileName
                }).returning({ id: model.id });

                if (tags.length > 0) {
                    await db.insert(modelTag).values(
                        tags.map(tagId => ({
                            modelId: lastEntry.id,
                            tagId: tagId
                        }))
                    );
                }
            });

            return {success: true, message: 'Model uploaded successfully'};
        } catch (message) {
            return fail(500, {
                message: message || 'Failed to upload model'
            });
        }
    }
};