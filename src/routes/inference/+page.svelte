<script>
	import { enhance } from '$app/forms';
	let { data } = $props();

	let selectedId = $state(data.selectedConversationId);
	let selectedModel = $state('gemma:2b');
	let editingId = $state(null);
	let draftName = $state('');
	let newMessage = $state('');
	let error = $state('');
	let submitting = $state(false);

	$effect(() => {
		selectedId = data.selectedConversationId;
	});

	$inspect(data.messages);
</script>

<div class="flex h-[95vh] bg-gray-900">
	<!-- Conversations Sidebar -->
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
					{:else if selectedId === conversation.id}
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
						<button
							class="w-full px-2 py-1 text-left text-gray-400 hover:bg-gray-700 rounded truncate"
							onclick={() => {
								selectedId = conversation.id;
								editingId = null;
							}}
						>
							{conversation.name}
						</button>
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

	<!-- Chat Main Area -->
	<div class="flex-1 flex flex-col">
		<!-- Messages Container -->
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#each data.messages as message}
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

		<!-- Input Area -->
		<div class="p-4 bg-gray-800 border-t border-gray-700">
			<form
				method="POST"
				action="?/submit_message"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
					  submitting = false;
					  await update();
			
				  if (result.type === 'success') {
					toast.success("Success");
				  } else if (result.type === 'failure') {
					toast.success("Failed");
				  } else if (result.type === 'error') {
					toast.success("Error");
				  }
				};
			  }}
				class="max-w-4xl mx-auto relative"
			>
				<input type="hidden" name="conversationId" value={selectedId} />
				<div class="flex gap-2">
					<select
						name="model"
						bind:value={selectedModel}
						class="px-3 py-2 bg-gray-700 text-gray-200 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
						disabled={submitting}
					>
						<option value="gemma:2b">Gemma</option>
						<option value="deepseek-r1:1.5b">Deepseek R1</option>
					</select>
					
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