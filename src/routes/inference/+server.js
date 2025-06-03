import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { message, conversation, inferenceModel, user } from '$lib/server/db/schema';
import { eq, and, max } from 'drizzle-orm';
import { callCloudRun } from '$lib';

export async function POST({ request }) {
    try {
        const { useCloud, useCustomModels, conversationId, userMessage, modelName } = await request.json();

        console.log('Received request:', { useCloud, useCustomModels, conversationId, userMessage, modelName });

        const [conv] = await db.select()
            .from(conversation)
            .where(eq(conversation.id, conversationId));

        if (!conv) return json({ error: 'Conversation not found' }, { status: 404 });

        const [model] = await db.select({ ollamaName: inferenceModel.ollamaName })
            .from(inferenceModel)
            .where(eq(inferenceModel.id, conv.inferenceModelId));

        if (!model) return json({ error: 'Model not found' }, { status: 404 });

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

        let ollamaRes = null;
        
        if (useCloud) {
            const [userData] = await db.select()
                .from(user)
                .where(eq(user.id, conv.userId));

            if (userData.length <= 0) return json({ error: 'User not found' }, { status: 404 });

            ollamaRes = await callCloudRun({
                cloudUrl: userData.cloudUrl,
                cloudKeyJsonString: userData.cloudKey,
                path: '/api/generate',
                method: 'POST',
                body: {
                    model: model.ollamaName,
                    prompt: userMessage,
                    stream: true
                }
            });
            
            if (!ollamaRes.ok) {
                throw new Error(await ollamaRes.text());
            }
        }
        else if (useCustomModels) {
            const [placeToRun, modelNameToRun] = modelName.split(':');
            console.log(modelName)
            if (placeToRun === 'local') {
                ollamaRes = await fetch(`${env.OLLAMA_URL}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: modelNameToRun,
                        prompt: userMessage,
                        stream: true
                    })
                });
            }
            else if (placeToRun === 'cloud') {
                const [userData] = await db.select()
                .from(user)
                .where(eq(user.id, conv.userId));

                if (userData.length <= 0) return json({ error: 'User not found' }, { status: 404 });

                ollamaRes = await callCloudRun({
                    cloudUrl: userData.cloudUrl,
                    cloudKeyJsonString: userData.cloudKey,
                    path: '/api/generate',
                    method: 'POST',
                    body: {
                        model: modelNameToRun,
                        prompt: userMessage,
                        stream: true
                    }
                });
            }
        }
        else {            
                ollamaRes = await fetch(`${env.OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model.ollamaName,
                    prompt: userMessage,
                    stream: true
                })
            });

            if (!ollamaRes.ok) {
                throw new Error(await ollamaRes.text());
            }
        }

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const parsed = JSON.parse(chunk);
                        assistantContent += parsed.response;
                        
                        controller.enqueue(`data: ${JSON.stringify(parsed)}\n\n`);
                    }

                    await db.insert(message).values({
                        conversationId,
                        content: assistantContent,
                        role: 'assistant',
                        sequence: sequence + 1
                    });

                    controller.enqueue('data: [DONE]\n\n');
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error(error);
        return json({ error: error.message }, { status: 500 });
    }
}