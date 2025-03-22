import { eq, inArray, desc, asc, and, max } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { conversation, message } from '$lib/server/db/schema.js';
import { env } from '$env/dynamic/private';

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    },
    new_conversation: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        const [newConversation] = await db.insert(conversation).values({
            name: 'New Conversation',
            userId: event.locals.session.userId
        }).returning();
        return {
            selectedConversationId: newConversation.id
        }
    },
    rename_conversation: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        const formData = await event.request.formData();
        const conversationId = formData.get('conversationId');
        const newName = formData.get('newName').trim();

        if (!newName || newName === '') {
            return fail(400, { message: 'Name cannot be empty' })
        }

        const updateConversation = await db.update(conversation)
            .set({ name: newName })
            .where(and(
                eq(conversation.id, conversationId),
                eq(conversation.userId, event.locals.session.userId)
            )).returning();
        
        if (!updateConversation.length) {
            return fail(404, { message: 'Conversation not found' })
        }

    },
    submit_message: async (event) => {
        if (!event.locals.session) return fail(401);

        const formData = await event.request.formData();
        const conversationId = formData.get('conversationId');
        const userMessage = formData.get('message');
        const model = formData.get('model');

        const [maxSeq] = await db.select({ max: max(message.sequence) })
            .from(message)
            .where(eq(message.conversationId, conversationId));

        const sequence = (maxSeq?.max || 0) + 1;

        await db.insert(message).values({
            conversationId,
            content: userMessage,
            role: 'user',
            sequence
        });

        const ollamaResponse = await fetch(`${env.OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: userMessage,
                stream: false
            })
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama error: ${ollamaResponse.statusText}`);
        }

        const ollamaData = await ollamaResponse.json();
        const assistantResponse = ollamaData.response;

        await db.insert(message).values({
            conversationId,
            content: assistantResponse,
            role: 'assistant',
            sequence: sequence + 1
        });

        const updatedMessages = await db.select()
            .from(message)
            .where(eq(message.conversationId, conversationId))
            .orderBy(asc(message.sequence));

        return {
            success: true,
            messages: updatedMessages
        };
    }
};

export async function load({ locals }) {
    // Redirect unauthenticated users
    if (!locals?.user?.id) {
        throw redirect(302, '/login');
    }

    const userID = locals.user.id;

    // Get conversations with messages
    const conversations = await db.select()
        .from(conversation)
        .where(eq(conversation.userId, userID))
        .orderBy(desc(conversation.createdAt));

    // Redirect if no conversations exist
    if (conversations.length === 0) {
        return {
            conversations: [],
            selectedConversationId: null
        };
    }

    // Get messages for all conversations
    const conversationIds = conversations.map(c => c.id);
    const messages = await db.select()
        .from(message)
        .where(inArray(message.conversationId, conversationIds))
        .orderBy(asc(message.sequence));

    // Structure conversations with messages
    const conversationsWithMessages = conversations.map(conv => ({
        ...conv,
        messages: messages
            .filter(msg => msg.conversationId === conv.id)
            .sort((a, b) => a.sequence - b.sequence)
    }));

    console.log()

    return {
        conversations: conversationsWithMessages,
        messages: conversationsWithMessages[0].messages,
        selectedConversationId: conversations[0].id
    };
}