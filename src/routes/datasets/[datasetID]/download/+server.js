import { dataset} from '$lib/server/db/schema';
import { db } from '$lib/server/db/index';
import { eq } from 'drizzle-orm';
import { fail, error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
    try {
        const [record] = await db.select({
            filePath: dataset.filePath,
            downloads: dataset.downloads
        }).from(dataset).where(eq(dataset.id, params.datasetID));

        if (!record?.filePath) {
            throw error(404, 'File not found');
        }

        const filePath = path.join(process.cwd(), 'static/datasets', record.filePath);
        const file = fs.readFileSync(filePath);
        
        await db.update(dataset)
            .set({ downloads: record.downloads + 1 })
            .where(eq(dataset.id, params.datasetID));

        const originalFilename = path.basename(record.filePath);
        const filenameParts = originalFilename.split('_');
        let modifiedFilename = originalFilename;
        
        if (filenameParts.length > 2) {
            modifiedFilename = filenameParts.slice(2).join('_');
        }

        return new Response(file, {
            headers: {
                'Content-Disposition': `attachment; filename="${modifiedFilename}"`,
                'X-Download-Count': (record.downloads + 1).toString()
            }
        });
    } catch (err) {
        if (err?.status === 404) {
            throw error(404, 'File not found');
        }
        console.error('Download error:', err);
        throw error(500, 'Download failed');
    }
}