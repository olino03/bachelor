import { db } from '$lib/server/db/index.js';import { redirect } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { inferenceModel, conversation} from '$lib/server/db/schema.js';

export async function load({ locals }) {
    
    if(!locals.user) throw redirect(302, '/login');

    const [defaultModel] = await db.select()
        .from(inferenceModel).
        where(eq(inferenceModel.isDefault, true));

    const userConversations = await db.select()
        .from(conversation)
        .where(eq(conversation.userId, locals.user.id))
        .orderBy(desc(conversation.createdAt));
    
    if (userConversations.length == 0) {
        const [newConversation] = await db.insert(conversation)
        .values({
            name: 'New Conversation',
            userId: locals.user.id,
            inferenceModelId: defaultModel.id
        })
        
        return redirect('302', `inference/${newConversation.id}`);
    }

    return redirect('302', `inference/${userConversations[0].id}`);
}