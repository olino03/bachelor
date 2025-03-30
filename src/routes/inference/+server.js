// routes/api/chat/+server.js
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { message, conversation, inferenceModel } from '$lib/server/db/schema';
import { eq, and, max } from 'drizzle-orm';

export async function POST({ request }) {
    try {
        const { conversationId, userMessage } = await request.json();

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

        const ollamaRes = await fetch(`${env.OLLAMA_URL}/api/generate`, {
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