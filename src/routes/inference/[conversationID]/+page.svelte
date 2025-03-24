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

	let currentConversation = $derived(
		data.conversations.find((c) => c.id === Number($page.params.conversationID))
	);
	let currentModel = $derived(
		data.models.find((m) => m.id === currentConversation.inferenceModelId)
	);
	$inspect(currentConversation);
	$inspect(currentModel);
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
			{#each currentConversation.messages as message}
				<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-3xl p-4 rounded-lg {message.role === 'user'
							? 'bg-[#ffd54f] text-[#1e1e1e]'
							: 'bg-[#1e1e1e] text-white'}"
					>
						{message.content}
					</div>
				</div>
			{/each}
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
								<option value={model.id} selected={model.id === currentModel.id}>
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
							const originalMessage = newMessage;
							const tempId = Date.now();

							// Optimistically add message
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
															id: tempId,
															content: originalMessage,
															role: 'user',
															createdAt: new Date().toISOString()
														}
													]
												}
											: c
									)
								};
							}
							newMessage = '';

							return async ({ update }) => {
								try {
									await update();
								} catch (err) {
									// Rollback on error
									if (currentConversation) {
										data = {
											...data,
											conversations: data.conversations.map((c) =>
												c.id === currentConversation.id
													? {
															...c,
															messages: c.messages.filter((m) => m.id !== tempId)
														}
													: c
											)
										};
									}
									newMessage = originalMessage;
									error = 'Failed to send message';
								}
								submitting = false;
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
								class="flex-1 px-4 py-2 bg-[#121212] text-white rounded-lg border-none focus:ring-2 focus:ring-[#ffd54f]"
								disabled={submitting}
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
			</div>

			{#if error}
				<div class="mt-2 text-red-400 text-sm text-center">{error}</div>
			{/if}
		</div>
	</div>
</div>
