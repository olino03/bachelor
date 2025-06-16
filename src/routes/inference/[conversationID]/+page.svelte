<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { SSE } from 'sse.js';
    import { marked } from 'marked';

    let { data } = $props();

    let modelSourceType = $state('local'); 
    let editingId = $state(null);
    let draftName = $state('');
    let newMessage = $state('');
    let error = $state('');
    let submitting = $state(false);
    let streamBuffer = $state('');
    let scrollTarget = $state(null);
    let tempAssistantMessageId = $state(null);

    let selectedCustomModelUIName = $state('');

    let currentConversation = $derived(
        data.conversations.find((c) => c.id === Number($page.params.conversationID))
    );

    let currentModel = $derived(
        modelSourceType === 'local' ? data.localModels.find(m => m.id === currentConversation?.inferenceModelId) :
        modelSourceType === 'cloud' ? data.cloudModels.find(m => m.id === currentConversation?.inferenceModelId) :
        null 
    );

    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: true 
    });

    $effect(() => {
        if (modelSourceType === 'custom') {
            let newSelectedName = '';
            if (data.customModels && data.customModels.length > 0) {
                if (currentConversation && currentConversation.inferenceModelId) {
                    const modelForConversation = data.customModels.find(m => {
                        return m.name === selectedCustomModelUIName;
                    });

                    if (modelForConversation) {
                        newSelectedName = modelForConversation.name;
                    } else if (selectedCustomModelUIName && data.customModels.find(m => m.name === selectedCustomModelUIName)) {
                        newSelectedName = selectedCustomModelUIName;
                    } else {
                        newSelectedName = data.customModels[0].name;
                    }
                } else if (selectedCustomModelUIName && data.customModels.find(m => m.name === selectedCustomModelUIName)) {
                     newSelectedName = selectedCustomModelUIName;
                } else if (data.customModels.length > 0) {
                    newSelectedName = data.customModels[0].name;
                }
            }
            if (selectedCustomModelUIName !== newSelectedName) {
                selectedCustomModelUIName = newSelectedName;
            }
        }
    });


    function processContent(content) {
        const thinkBlocks = [];
        let processed = content || "";

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

        if (!currentConversation) {
            console.error("Submit Error: No current conversation found! Cannot proceed.");
            error = "No active conversation. Cannot send message.";
            submitting = false;
            return;
        }

        data = {
            ...data,
            conversations: data.conversations.map((c) =>
                c.id === currentConversation.id
                    ? {
                        ...c,
                        messages: [
                            ...(c.messages || []),
                            {
                                id: userTempId,
                                content: userMessage,
                                role: 'user',
                                createdAt: new Date().toISOString(),
                                sequence: ((c.messages?.[c.messages.length - 1]?.sequence) || 0) + 1,
                                status: 'complete'
                            }
                        ]
                    }
                    : c
            )
        };
        tempAssistantMessageId = assistantTempId;
        newMessage = '';
        scrollToBottom();

        let eventSource;
        let modelIdForPayload;
        let modelNameForPayload;

        const useCloudForInference = modelSourceType === 'cloud';
        const useCustomModelsFlag = modelSourceType === 'custom';

        if (useCustomModelsFlag) {
            if (!selectedCustomModelUIName) {
                error = "No custom model selected from the dropdown.";
                console.error("Submit Error: selectedCustomModelUIName is empty for custom source.");
                submitting = false;
                data = {...data, conversations: data.conversations.map(c => c.id === currentConversation.id ? {...c, messages: c.messages.filter(m => m.id !== userTempId)} : c)};
                tempAssistantMessageId = null;
                return;
            }
            const chosenCustomModel = data.customModels?.find(m => m.name === selectedCustomModelUIName);
            if (chosenCustomModel) {
                modelIdForPayload = null; 
                modelNameForPayload = chosenCustomModel.ollamaName || chosenCustomModel.name;
             } else {
                error = `Selected custom model "${selectedCustomModelUIName}" is not valid or not found in the list. Please reselect.`;
                submitting = false;
                data = {...data, conversations: data.conversations.map(c => c.id === currentConversation.id ? {...c, messages: c.messages.filter(m => m.id !== userTempId)} : c)};
                tempAssistantMessageId = null;
                return;
            }
        } else {
            if (!currentModel) {
               error = "No model selected or model data is missing for local/cloud. Cannot send message.";
                submitting = false;
                data = {...data, conversations: data.conversations.map(c => c.id === currentConversation.id ? {...c, messages: c.messages.filter(m => m.id !== userTempId)} : c)};
                tempAssistantMessageId = null;
                return;
            }
            modelIdForPayload = currentModel.id;
            modelNameForPayload = currentModel.ollamaName || currentModel.name;
        }

        try {
            const payloadObject = {
                useCloud: useCloudForInference,
                useCustomModels: useCustomModelsFlag,
                conversationId: currentConversation.id,
                userMessage: userMessage,
                modelId: modelIdForPayload,
                modelName: modelNameForPayload
            };

            const stringifiedPayload = JSON.stringify(payloadObject);

            eventSource = new SSE('/inference', {
                headers: { 'Content-Type': 'application/json' },
                payload: stringifiedPayload
            });

            eventSource.addEventListener('message', async (e) => {
                if (!currentConversation) return;
                try {
                    if (e.data === '[DONE]') {
                        const finalConversations = data.conversations.map((c) => {
                            if (c.id === currentConversation.id) {
                                return {
                                    ...c,
                                    messages: c.messages.map((m) =>
                                        m.id === assistantTempId
                                            ? { ...m, status: 'complete', content: streamBuffer, modelUsed: modelNameForPayload }
                                            : m
                                    )
                                };
                            }
                            return c;
                        });
                        data = { ...data, conversations: finalConversations };
                        streamBuffer = '';
                        tempAssistantMessageId = null;
                        submitting = false;
                        scrollToBottom();
                        return;
                    }

                    const parsed = JSON.parse(e.data);
                    if (parsed.response) {
                       streamBuffer += parsed.response;
                    }

                    const currentMessages = currentConversation.messages || [];
                    const lastUserMessage = currentMessages.find(m => m.id === userTempId);
                    const lastMessageSequence = lastUserMessage?.sequence || (currentMessages.length > 0 ? currentMessages[currentMessages.length -1]?.sequence || 0 : 0);


                    const updatedConversations = data.conversations.map((c) => {
                        if (c.id === currentConversation.id) {
                            const existingAssistantMessage = c.messages.find(m => m.id === assistantTempId);
                            if (existingAssistantMessage) {
                                return {
                                    ...c,
                                    messages: c.messages.map((m) =>
                                        m.id === assistantTempId
                                            ? { ...m, content: streamBuffer, status: 'streaming' }
                                            : m
                                    )
                                };
                            } else {
                                return {
                                    ...c,
                                    messages: [
                                        ...c.messages,
                                        {
                                            id: assistantTempId,
                                            content: streamBuffer,
                                            role: 'assistant',
                                            createdAt: new Date().toISOString(),
                                            sequence: lastMessageSequence + 1,
                                            status: 'streaming',
                                            modelUsed: modelNameForPayload
                                        }
                                    ]
                                };
                            }
                        }
                        return c;
                    });
                    data = { ...data, conversations: updatedConversations };
                    scrollToBottom();
                } catch (err) {
                    console.error('Error handling stream message:', err, "Data:", e.data);
                    error = 'Error processing streamed response.';
                    if (tempAssistantMessageId && currentConversation) {
                         const errorConversations = data.conversations.map(conv =>
                            conv.id === currentConversation.id ? {
                                ...conv,
                                messages: conv.messages.map(msg =>
                                    msg.id === tempAssistantMessageId ? {...msg, content: streamBuffer + "\n\nError processing stream.", status: 'error'} : msg
                                )
                            } : conv
                         );
                         data = { ...data, conversations: errorConversations };
                    }
                    streamBuffer = '';
                    tempAssistantMessageId = null;
                    submitting = false;
                    if (eventSource) eventSource.close();
                }
            });

            eventSource.addEventListener('error', (err) => {
                error = 'Failed to stream response. Please check console for details.';
                console.error('SSE error:', err);
                submitting = false;
                streamBuffer = '';
                if (currentConversation) {
                    const errorConversations = data.conversations.map((c) =>
                        c.id === currentConversation.id
                            ? {
                                ...c,
                                messages: c.messages.filter((m) =>
                                    m.id !== userTempId && m.id !== assistantTempId
                                )
                            }
                            : c
                    );
                    data = { ...data, conversations: errorConversations };
                }
                tempAssistantMessageId = null;
                if (eventSource) eventSource.close();
            });

            eventSource.stream();

        } catch (err) {
            error = 'Failed to send message. Please check console for details.';
            console.error('Submit error:', err);
            submitting = false;
            streamBuffer = '';
            if (currentConversation) {
                 const submitErrorConversations = data.conversations.map((c) =>
                    c.id === currentConversation.id
                        ? {
                            ...c,
                            messages: c.messages.filter((m) => m.id !== userTempId)
                        }
                        : c
                );
                data = { ...data, conversations: submitErrorConversations };
            }
            tempAssistantMessageId = null;
        }
    }

    function cycleModelSource() {
        const sources = ['local', 'cloud', 'custom'];
        const currentIndex = sources.indexOf(modelSourceType);
        modelSourceType = sources[(currentIndex + 1) % sources.length];
    }

    $effect(() => {
        scrollToBottom();
    });

    console.log("Page data:", data);
</script>

<div class="flex h-[95vh] bg-[#121212] font-sans">

    <div class="w-64 flex flex-col p-4 bg-[#1e1e1e]">
        <div class="mb-2 flex-1 overflow-y-auto"
            style="scrollbar-color: #ffd54f #121212; scrollbar-width: thin;">
            {#each data.conversations as conversation (conversation.id)}
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
                                class="w-full px-2 py-1 text-white bg-[#121212] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd54f]"
                                onkeydown={(e) => { if (e.key === 'Enter') {e.preventDefault(); e.target.form.requestSubmit();} else if (e.key === 'Escape') editingId = null; }}
                                onblur={(e) => { if (draftName !== conversation.name) e.target.form.requestSubmit(); else editingId = null;}}
                                autofocus
                            />
                        </form>
                    {:else if conversation.id === Number($page.params.conversationID)}
                         <div class="flex items-center rounded-lg border border-[#ffd54f] justify-between group p-2 bg-[#121212]">
                            <span class="flex-1 text-white truncate text-sm" title={conversation.name}>{conversation.name}</span>
                            <button
                                onclick={() => {
                                    editingId = conversation.id;
                                    draftName = conversation.name;
                                }}
                                aria-label="Edit conversation name"
                                class="invisible group-hover:visible px-1 text-gray-400 hover:text-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>
                    {:else}
                        <form method="POST" action="?/change_conversation" use:enhance class="w-full">
                            <input type="hidden" name="conversationId" value={conversation.id} />
                            <button
                                class="w-full px-2 py-1 text-left text-sm text-white hover:bg-[#121212] rounded-lg truncate"
                                title={conversation.name}
                            >
                                {conversation.name}
                            </button>
                        </form>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="flex flex-col items-center justify-between gap-3 pt-3 border-t border-gray-700">
            <form class="w-full" method="POST" action="?/new_conversation" use:enhance>
                <button
                    class="w-full py-2 px-4 bg-[#ffd54f] hover:bg-amber-400 text-[#1e1e1e] font-medium rounded-lg transition-colors text-sm"
                >
                    New Conversation
                </button>
            </form>
            <a class="w-full" href="/inference/upload" title="Upload or manage custom models">
                <button
                    class="w-full py-2 px-4 bg-[#ffd54f] hover:bg-amber-400 text-[#1e1e1e] font-medium rounded-lg transition-colors text-sm"
                >
                    Manage Custom Models
                </button>
            </a>
        </div>
    </div>

    <div class="flex-1 flex flex-col bg-[#121212]">
        <div class="flex-1 overflow-y-auto p-4 space-y-4" style="scrollbar-color: #4f4f4f #121212; scrollbar-width: thin;" bind:this={scrollTarget}>
            {#if currentConversation?.messages && currentConversation.messages.length > 0}
                {#each currentConversation.messages as message (message.id)}
                    <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                        <div class={`max-w-xl lg:max-w-2xl xl:max-w-3xl p-3.5 rounded-lg shadow-sm ${
                            message.role === 'user'
                            ? 'bg-[#ffd54f] text-[#1e1e1e]'
                            : 'bg-[#1e1e1e] text-white'
                        } ${message.status === 'streaming' ? 'opacity-90' : ''} ${message.status === 'error' ? 'border-red-500/50 bg-red-900/20' : ''}`}>
                            {#if message.role === 'assistant'}
                                {@const { html, thinkBlocks } = processContent(message.content)}

                                {#if thinkBlocks.length > 0}
                                     <div class="mb-3 border-l-4 border-amber-500 pl-3 py-2 bg-black/20 rounded-r">
                                        <div class="text-xs font-semibold text-amber-500 mb-1 uppercase tracking-wider">Thinking Process</div>
                                        {#each thinkBlocks as block}
                                            <div class="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">{block}</div>
                                        {/each}
                                    </div>
                                {/if}

                                {#if html}
                                     <div class="prose prose-sm prose-invert max-w-none text-white">
                                        {@html html}
                                    </div>
                                {/if}
                            {:else}
                                 <div class="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                            {/if}

                            {#if message.status === 'streaming'}
                                 <div class="mt-2 h-1 w-12 bg-amber-500/60 rounded-full animate-pulse"></div>
                            {/if}
                            {#if message.status === 'error'}
                                <div class="mt-1.5 text-red-300 text-xs font-medium">Error generating response.</div>
                            {/if}
                        </div>
                    </div>
                {/each}
            {:else}
                 <div class="text-center text-gray-400 mt-10 flex flex-col items-center justify-center h-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-gray-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <p class="text-lg">No messages yet</p>
                    <p class="text-sm text-gray-500">Start the conversation by typing below.</p>
                </div>
            {/if}
            <div class="h-1"></div>
        </div>

        <div class="p-4 bg-[#1e1e1e] border-t border-[#ffd54f]/50">
            <div class="max-w-3xl mx-auto">
                <div class="flex items-center gap-3 mb-3">
                    <div class="flex-none">
                        <div
                            class="relative flex items-center h-10 bg-[#121212] rounded-full p-1 cursor-pointer w-60"
                            onclick={cycleModelSource}
                            title={`Current source: ${modelSourceType}. Click to cycle.`}
                        >
                            <div class="absolute inset-0 flex items-center justify-around text-xs font-medium px-2 z-0">
                                <span class="{modelSourceType === 'local' ? 'text-[#ffd54f]' : 'text-gray-400 hover:text-gray-200'} transition-colors">Local</span>
                                <span class="{modelSourceType === 'cloud' ? 'text-[#ffd54f]' : 'text-gray-400 hover:text-gray-200'} transition-colors">Cloud</span>
                                <span class="{modelSourceType === 'custom' ? 'text-[#ffd54f]' : 'text-gray-400 hover:text-gray-200'} transition-colors">Custom</span>
                            </div>

                            <div
                                class="absolute top-1 left-1 h-8 w-[calc(theme(spacing.60)/3-theme(spacing.1))]
                                       bg-[#ffd54f] rounded-full
                                       transition-transform duration-300 ease-in-out
                                       flex items-center justify-center shadow-md z-10
                                       {modelSourceType === 'local' ? 'translate-x-0' :
                                        modelSourceType === 'cloud' ? 'translate-x-[calc(theme(spacing.60)/3)]' :
                                        modelSourceType === 'custom' ? 'translate-x-[calc(theme(spacing.60)*2/3)]' : ''}"
                            >
                                <span class="text-xs font-bold text-[#1e1e1e] uppercase">
                                    {modelSourceType}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form method="POST" action="?/change_model" use:enhance class="flex-none w-48">
                         <input type="hidden" name="modelSourceType" value={modelSourceType} />
                         {#if currentConversation}
                            <input type="hidden" name="conversationId" value={currentConversation.id} />
                         {/if}
                        <select
                            name="model"
                            class="w-full h-10 px-3 py-2 text-sm bg-[#121212] text-white border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd54f] appearance-none"
                            disabled={submitting || (modelSourceType === 'custom' && (!data.customModels || data.customModels.length === 0))}
                            title="Select Model"
                            onchange={(e) => {
                                if (modelSourceType === 'custom') {
                                    selectedCustomModelUIName = e.target.value;
                                }
                                e.target.form.requestSubmit();
                            }}
                            value={
                                modelSourceType === 'custom'
                                    ? selectedCustomModelUIName
                                    : (currentModel?.id || '') 
                            }
                        >
                            {#if modelSourceType === 'local'}
                                {#if data.localModels && data.localModels.length > 0}
                                    {#each data.localModels as model (model.id)}
                                        <option value={model.id} selected={model.id === currentModel?.id}>
                                            {model.name}
                                        </option>
                                    {/each}
                                {:else}
                                    <option value="" disabled selected>No local models</option>
                                {/if}
                            {:else if modelSourceType === 'cloud'}
                                {#if data.cloudModels && data.cloudModels.length > 0}
                                    {#each data.cloudModels as model (model.id)}
                                        <option value={model.id} selected={model.id === currentModel?.id}>
                                            {model.name}
                                        </option>
                                    {/each}
                                {:else}
                                     <option value="" disabled selected>No cloud models</option>
                                {/if}
                            {:else if modelSourceType === 'custom'}
                                {#if data.customModels && data.customModels.length > 0}
                                    {#each data.customModels as customModel }
                                        <option value={customModel.name} selected={customModel.name === selectedCustomModelUIName}>
                                            {customModel.name}
                                        </option>
                                    {/each}
                                {:else}
                                    <option value="" disabled selected>No custom models available</option>
                                {/if}
                            {/if}
                        </select>
                    </form>
                </div>

                <form onsubmit={handleSubmit} class="flex items-center gap-3">
                    <input
                        type="text"
                        bind:value={newMessage}
                        placeholder="Type your message... (Shift+Enter for newline)"
                        class="flex-1 px-4 py-2.5 text-sm bg-[#121212] text-white rounded-lg border-transparent focus:outline-none focus:ring-2 focus:ring-[#ffd54f] h-10"
                        disabled={submitting || !currentConversation}
                        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                    />
                    <button
                        type="submit"
                        class="px-5 py-2 bg-[#ffd54f] hover:bg-amber-400 text-[#1e1e1e] font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center h-10"
                        disabled={!newMessage.trim() || submitting || !currentConversation}
                        title="Send Message"
                    >
                        {#if submitting}
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#1e1e1e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Sending...</span>
                        {:else}
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            <span>Send</span>
                        {/if}
                    </button>
                </form>

                {#if error}
                    <div class="mt-2.5 text-red-400 text-xs text-center py-1 px-2 bg-red-900/30 rounded-lg">
                        {error}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>