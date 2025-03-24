<script>
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let selectedModel = $state('gemma:2b');
    
	let editingId = $state(null);
	let draftName = $state('');
	let newMessage = $state('');
	let error = $state('');
	let submitting = $state(false);

    let currentConversation = $derived(data.conversations.find(c => c.id === Number($page.params.conversationID)));
    let currentModel = $derived(data.models.find(m => m.id === currentConversation.inferenceModelId))
    $inspect(currentConversation);
    $inspect(currentModel);
</script>

<!-- <div>
    {#each data.conversations as conversation}
        {#if editingId === conversation.id}
            <p class='text-white'>Edit me</p>
        {:else if conversation.id === data.selectedConversationId}
            <p class='text-white'>{conversation.name} is Selected</p>
        {:else}
            <form
            method="POST"
            action="?/change_conversation"
            use:enhance>
                <input type="hidden" name="conversationId" value={conversation.id} />
                <button class='text-white'>
                    {conversation.name} {conversation.id} normal convo
                </button>
            </form>
        {/if}
    {/each}
</div>

<div>
    <form
        method="POST"
        action="?/new_conversation"
        use:enhance>
        <button class="text-white">
            New Conversation
        </button>
    </form>
</div>

<form
    method="POST"
    action="?/change_model"
    use:enhance
>
    <select
        name="model"
        onchange={(e) => e.target.form.requestSubmit()}
    >
        {#each data.models as model}
            <option
                value={model.id}
                selected={model.id === conversationID}
            >
                {model.name}
            </option>
        {/each}
    </select>
</form> -->

<div class="flex h-[95vh] bg-gray-900">

	<div class="w-64 flex flex-col p-4 bg-gray-800 border-r border-gray-700">
		<div class="flex-1 overflow-y-auto">
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
								class="w-full px-2 py-1 text-gray-100 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								onkeydown={(e) => e.key === 'Enter' && e.target.form.requestSubmit()}
								onblur={(e) => e.target.form.requestSubmit()}
							/>
						</form>
					{:else if conversation.id === Number($page.params.conversationID)}
						<div class="flex items-center justify-between group">
							<span class="flex-1 text-gray-200 truncate">{conversation.name}</span>
							<button
								onclick={() => {
									editingId = conversation.id;
									draftName = conversation.name;
								}}
								class="invisible group-hover:visible px-2 text-gray-400 hover:text-gray-200"
							>
								<i class="fas fa-pencil-alt text-sm" />
							</button>
						</div>
					{:else}
						<form
                            method="POST"
                            action="?/change_conversation"
                            use:enhance
                            class="w-full"
                        >
                            <input type="hidden" name="conversationId" value={conversation.id} />
                            <button
                                class="w-full px-2 py-1 text-left text-gray-400 hover:bg-gray-700 rounded truncate"
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
				class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
			>
				New Conversation
			</button>
		</form>
	</div>


	<div class="flex-1 flex flex-col">
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
            {#each currentConversation.messages as message}
                <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div
                        class="max-w-3xl p-4 rounded-lg {message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-100'}"
                    >
                        {message.content}
                    </div>
                </div>
            {/each}
        </div>


		<div class="p-4 bg-gray-800 border-t border-gray-700">
            <div class="max-w-4xl mx-auto relative">
                <div class="flex gap-2">
                    <form
                        method="POST"
                        action="?/change_model"
                        use:enhance
                        class="flex-none"
                    >
                        <select
                            name="model"
                            onchange={(e) => e.target.form.requestSubmit()}
                            class="px-3 py-2 bg-gray-700 text-gray-200 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                        >
                            {#each data.models as model}
                                <option
                                    value={model.id}
                                    selected={model.id === currentModel.id}
                                >
                                    {model.name}
                                </option>
                            {/each}
                        </select>
                    </form>
        
                    <form
                        method="POST"
                        action="?/submit_message"
                        use:enhance={() => {
                            submitting = true;
                            return async ({ result, update }) => {
                                submitting = false;
                                await update();
                            };
                        }}
                        class="flex-1"
                    >
                        <div class="flex gap-2">
                            <input
                                type="text"
                                name="message"
                                bind:value={newMessage}
                                placeholder="Type your message..."
                                class="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
                                disabled={submitting}
                            />
                            
                            <button
                                type="submit"
                                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!newMessage.trim() || submitting}
                            >
                                {#if submitting}
                                    <i class="fas fa-spinner fa-spin" />
                                {:else}
                                    Send
                                {/if}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        
            {#if error}
                <div class="mt-2 text-red-400 text-sm text-center">{error}</div>
            {/if}
        </div>
	</div>
</div>

<style>
	/* Add smooth scrolling behavior */
	html {
		scroll-behavior: smooth;
	}

	/* Custom scrollbar */
	::-webkit-scrollbar {
		width: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.1);
	}

	::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>