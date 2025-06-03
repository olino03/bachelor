import { sql, eq, inArray, desc, asc, and, max } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { conversation, message, inferenceModel, localModel, cloudModel, customLocalModel, customCloudModel } from '$lib/server/db/schema.js';
import { env } from '$env/dynamic/private';
import { goto } from '$app/navigation';
import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

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
        if (!event.locals.session) return fail(401);

        const [defaultModel] = await db.select()
            .from(inferenceModel).
            where(eq(inferenceModel.isDefault, true));

        const [newConversation] = await db.insert(conversation)
            .values({
                name: 'New Conversation',
                userId: event.locals.session.userId,
                inferenceModelId: defaultModel.id
            }).returning();

        return redirect(302, `/inference/${newConversation.id}`)
    },
    change_conversation: async (event) => {
        if (!event.locals.session) return fail(401);

        const formData = await event.request.formData();
        const conversationId = formData.get('conversationId');

        const wantedConversation = await db.select({ userId: conversation.userId })
            .from(conversation)
            .where(eq(conversation.id, conversationId))

        if (wantedConversation.length == 0) return redirect(404, '/inference');
        else if (wantedConversation[0].userId != event.locals.session.userId) return redirect(404, 'inference');

        return redirect(302, `/inference/${conversationId}`);
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
    change_model: async (event) => {
        if (!event.locals.session) return fail(401);

        const formData = await event.request.formData();
        const conversationId = await event.params.conversationID;

        const newInferenceModelId = formData.get('model');

        await db.update(conversation).set({
            inferenceModelId: newInferenceModelId
        }).where(eq(conversation.id, conversationId));

        return redirect(302, `/inference/${conversationId}`)
    }
};

export async function load({ locals, params }) {
    if (!locals?.user?.id) throw redirect(302, '/login');

    const userID = locals.user.id;
    const conversationID = params.conversationID;

    if (isNaN(conversationID)) throw redirect(404, '/inference');

    const [currentConversation] = await db.select()
        .from(conversation)
        .where(and(
            eq(conversation.id, conversationID),
            eq(conversation.userId, userID)
        )).limit(1);

    if (!currentConversation) throw redirect(302, '/inference');

    const userConversations = await db.select()
        .from(conversation)
        .where(eq(conversation.userId, userID))
        .orderBy(desc(conversation.createdAt));

    const messages = await db.select()
        .from(message)
        .where(eq(message.conversationId, conversationID))
        .orderBy(asc(message.sequence));

    const conversationsWithMessages = userConversations.map(conv => {
        const isSelected = conv.id === Number(conversationID);
        return {
            ...conv,
            ...(isSelected && { messages })
        };
    });

    const models = await db.select({
        id: inferenceModel.id,
        name: inferenceModel.name,
    }).from(inferenceModel);

    const localModels = await db
        .select({
            id: inferenceModel.id,
            ollamaName: inferenceModel.ollamaName,
            name: inferenceModel.name,
            isDefault: inferenceModel.isDefault,
            createdAt: inferenceModel.createdAt
        })
        .from(localModel)
        .innerJoin(
            inferenceModel,
            eq(localModel.modelId, inferenceModel.id)
        )
        .where(eq(localModel.userId, userID));

    const cloudModels = await db
        .select({
            id: inferenceModel.id,
            ollamaName: inferenceModel.ollamaName,
            name: inferenceModel.name,
            isDefault: inferenceModel.isDefault,
            createdAt: inferenceModel.createdAt
        })
        .from(cloudModel)
        .innerJoin(
            inferenceModel,
            eq(cloudModel.modelId, inferenceModel.id)
        )
        .where(eq(cloudModel.userId, userID));

    const customLocalModels = await db
        .select({
            ollamaName: sql`concat('local:', ${customLocalModel.modelName})`, 
            name: sql`concat('local:', ${customLocalModel.modelName})`,
        })
        .from(customLocalModel)
        .where(eq(customLocalModel.userId, userID));

    const customCloudModels = await db
        .select({
            ollamaName: sql`concat('cloud:', ${customCloudModel.modelName})`,
            name: sql`concat('cloud:', ${customCloudModel.modelName})`,
        })
        .from(customCloudModel)
        .where(eq(customCloudModel.userId, userID));

    return {
        conversations: conversationsWithMessages,
        cloudModels: cloudModels,
        localModels: localModels,
        customModels: [...customLocalModels, ...customCloudModels],
        selectedConversationId: Number(conversationID)
    };
}