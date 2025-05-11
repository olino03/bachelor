<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { SSE } from 'sse.js';
	import { marked } from 'marked';

    let { data } = $props();

    let selectedModel = $state('gemma:2b');
    let editingId = $state(null);
    let draftName = $state('');
    let newMessage = $state('');
    let error = $state('');
    let submitting = $state(false);
    let streamBuffer = $state('');
    let scrollTarget = $state(null);
    let tempAssistantMessageId = $state(null);

    let currentConversation = $derived(
        data.conversations.find((c) => c.id === Number($page.params.conversationID))
    );

    let currentModel = $derived(
        data.models.find((m) => m.id === currentConversation?.inferenceModelId)
    );

	marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: true // Basic HTML sanitization
    });

    function processContent(content) {
        const thinkBlocks = [];
        let processed = content;

        // Extract <think> blocks
        processed = processed.replace(/<think>([\s\S]*?)<\/think>/gi, (match, p1) => {
            thinkBlocks.push(p1.trim());
            return '';
        });

        return {
            html: marked.parse(processed.trim()),
            thinkBlocks
        };
    }

    function scrollToBottom() {
        setTimeout(() => {
            scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }

    async function handleSubmit() {
        if (submitting || !newMessage.trim()) return;

        submitting = true;
        error = '';
        const userMessage = newMessage.trim();
        const userTempId = Date.now();
        const assistantTempId = Date.now() + 1;

        // Optimistically add user message
        if (currentConversation) {
            data = {
                ...data,
                conversations: data.conversations.map((c) =>
                    c.id === currentConversation.id
                        ? {
                            ...c,
                            messages: [
                                ...c.messages,
                                {
                                    id: userTempId,
                                    content: userMessage,
                                    role: 'user',
                                    createdAt: new Date().toISOString(),
                                    sequence: c.messages.length + 1,
                                    status: 'complete'
                                }
                            ]
                        }
                        : c
                )
            };
            tempAssistantMessageId = assistantTempId;
        }
        newMessage = '';

        try {
            const eventSource = new SSE('/inference', {
                headers: { 'Content-Type': 'application/json' },
                payload: JSON.stringify({
                    conversationId: currentConversation.id,
                    userMessage: userMessage
                })
            });

            eventSource.addEventListener('message', async (e) => {
                try {
                    if (e.data === '[DONE]') {
                        // Finalize assistant message
                        data = {
                            ...data,
                            conversations: data.conversations.map((c) =>
                                c.id === currentConversation.id
                                    ? {
                                        ...c,
                                        messages: c.messages.map((m) =>
                                            m.id === assistantTempId
                                                ? { ...m, status: 'complete' }
                                                : m
                                        )
                                    }
                                    : c
                            )
                        };
                        streamBuffer = '';
                        tempAssistantMessageId = null;
                        return;
                    }

                    const parsed = JSON.parse(e.data);
                    streamBuffer += parsed.response;

                    // Update or create temporary assistant message
                    data = {
                        ...data,
                        conversations: data.conversations.map((c) =>
                            c.id === currentConversation.id
                                ? {
                                    ...c,
                                    messages: c.messages.some((m) => m.id === assistantTempId)
                                        ? c.messages.map((m) =>
                                            m.id === assistantTempId
                                                ? {
                                                    ...m,
                                                    content: streamBuffer,
                                                    status: 'streaming'
                                                }
                                                : m
                                        )
                                        : [
                                            ...c.messages,
                                            {
                                                id: assistantTempId,
                                                content: streamBuffer,
                                                role: 'assistant',
                                                createdAt: new Date().toISOString(),
                                                sequence: c.messages.length + 2,
                                                status: 'streaming'
                                            }
                                        ]
                                }
                                : c
                        )
                    };
                    
                    scrollToBottom();
                } catch (err) {
                    console.error('Error handling stream:', err);
                }
            });

            eventSource.addEventListener('error', (err) => {
                error = 'Failed to stream response';
                submitting = false;
                streamBuffer = '';
                // Rollback both messages
                data = {
                    ...data,
                    conversations: data.conversations.map((c) =>
                        c.id === currentConversation.id
                            ? {
                                ...c,
                                messages: c.messages.filter((m) => 
                                    m.id !== userTempId && m.id !== assistantTempId
                                )
                            }
                            : c
                    )
                };
                tempAssistantMessageId = null;
            });

            eventSource.stream();

        } catch (err) {
            error = 'Failed to send message';
            submitting = false;
            streamBuffer = '';
            tempAssistantMessageId = null;
        } finally {
            submitting = false;
        }
    }

    $effect(() => {
        scrollToBottom();
    });
</script>

<div class="flex h-[95vh] bg-[#121212]">

    <div class="w-64 flex flex-col p-4 bg-[#1e1e1e]">
		<div class="mb-2 flex-1 overflow-y-auto"
            style="
            scrollbar-color: #ffd54f #121212;
            scrollbar-width: thin;">
			{#each data.conversations as conversation}
				<div class="mb-2">
					{#if editingId === conversation.id}
						<form
							method="POST"
							action="?/rename_conversation"
							use:enhance
							class="flex-1"
							onsubmit={() => (editingId = null)}
						>
							<input type="hidden" name="conversationId" value={conversation.id} />
							<input
								type="text"
								name="newName"
								bind:value={draftName}
								class="w-full px-2 py-1 text-white bg-[#121212] rounded focus:outline-none focus:ring-2 focus:ring-[#ffd54f]"
								onkeydown={(e) => e.key === 'Enter' && e.target.form.requestSubmit()}
								onblur={(e) => e.target.form.requestSubmit()}
							/>
						</form>
					{:else if conversation.id === Number($page.params.conversationID)}
						<div class="flex items-center rounded-lg border-[#ffd54f] justify-between group">
							<span class="flex-1 text-white truncate">{conversation.name}</span>
							<button
								onclick={() => {
									editingId = conversation.id;
									draftName = conversation.name;
								}}
                                aria-label="Edit conversation name"
								class="invisible group-hover:visible px-2 text-gray-400 hover:text-gray-200"
							>
								<i class="fas fa-pencil-alt text-sm"></i>
							</button>
						</div>
					{:else}
						<form method="POST" action="?/change_conversation" use:enhance class="w-full">
							<input type="hidden" name="conversationId" value={conversation.id} />
							<button
								class="w-full px-2 py-1 text-left text-white hover:bg-[#121212] rounded truncate"
							>
								{conversation.name}
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
		<form method="POST" action="?/new_conversation" use:enhance>
			<button
				class="w-full py-2 px-4 bg-[#ffd54f] hover:bg-white text-[#1e1e1e] rounded-lg transition-colors"
			>
				New Conversation
			</button>
		</form>
	</div>

    <div class="flex-1 flex flex-col">
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            {#if currentConversation?.messages}
                {#each currentConversation.messages as message}
					<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class={`max-w-3xl p-4 rounded-lg ${
							message.role === 'user' 
							? 'bg-[#ffd54f] text-[#1e1e1e]' 
							: 'bg-[#1e1e1e] text-white'
						} ${message.status === 'streaming' ? 'opacity-90' : ''}`}>
							{#if message.role === 'assistant'}
								{@const { html, thinkBlocks } = processContent(message.content)}
								
								{#if thinkBlocks.length > 0}
									<div class="mb-4 border-l-4 border-amber-400 pl-3 py-2 bg-gray-700/50 rounded-r">
										<div class="text-sm font-medium text-amber-400 mb-1">Thinking</div>
										{#each thinkBlocks as block}
											<div class="text-gray-300 text-sm whitespace-pre-wrap font-mono">{block}</div>
										{/each}
									</div>
								{/if}

								{#if html}
									<div class="prose prose-invert prose-sm max-w-none">
										{@html html}
									</div>
								{/if}
							{:else}
								<div class="whitespace-pre-wrap">{message.content}</div>
							{/if}

							{#if message.status === 'streaming'}
								<div class="mt-2 h-1 w-12 bg-amber-400/50 rounded-full animate-pulse"></div>
							{/if}
						</div>
					</div>
				{/each}
            {:else}
                <div class="text-center text-gray-400 mt-8">
                    Start a new conversation by typing a message below
                </div>
            {/if}
            <div bind:this={scrollTarget} ></div>
        </div>

        <div class="p-4 bg-[#1e1e1e] border-t border-[#ffd54f]">
            <div class="max-w-4xl mx-auto relative">
                <div class="flex gap-2">
                    <form method="POST" action="?/change_model" use:enhance class="flex-none w-40">
                        <select
                            name="model"
                            onchange={(e) => e.target.form.requestSubmit()}
                            class="w-full px-3 py-2 bg-[#121212] text-white border-none rounded-lg focus:ring-2 focus:ring-[#ffd54f]"
                            disabled={submitting}
                        >
                            {#each data.models as model}
                                <option value={model.id} selected={model.id === currentModel?.id}>
                                    {model.name}
                                </option>
                            {/each}
                        </select>
                    </form>

                    <form onsubmit={handleSubmit} class="flex-1">
                        <div class="flex gap-2">
                            <input
                                type="text"
                                bind:value={newMessage}
                                placeholder="Type your message..."
                                class="flex-1 px-4 py-2 bg-[#121212] text-white rounded-lg border-none focus:ring-2 focus:ring-[#ffd54f]"
                                disabled={submitting}
                                onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                            />
                            <button
                                type="submit"
                                class="px-6 py-2 bg-[#ffd54f] hover:bg-white text-[#1e1e1e] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!newMessage.trim() || submitting}
                            >
                                {#if submitting}
                                    <i class="fas fa-spinner fa-spin"></i>
                                {:else}
                                    Send
                                {/if}
                            </button>
                        </div>
                    </form>
                </div>

                {#if error}
                    <div class="mt-2 text-red-400 text-sm text-center">
                        {error}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>