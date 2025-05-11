<script>
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';

	const { form, data } = $props();
	
	let activeSection = $state('cloud');
	let containerHeight = $state(400);
	
	function updateContainerHeight() {
		const viewportHeight = window.innerHeight;
		const headerHeight = 120; 
		containerHeight = viewportHeight - headerHeight - 32;
	}
	
	$effect(() => {
		updateContainerHeight();
		window.addEventListener('resize', updateContainerHeight);
		return () => window.removeEventListener('resize', updateContainerHeight);
	});
</script>
<!-- 
<div class="min-h-screen flex flex-col items-center p-4 space-y-4 w-full max-w-3xl">
	<div class="grid grid-cols-2 gap-2 w-full max-w-md">
		<button
			class={`py-2 rounded-lg transition-colors ${activeSection === 'cloud' ? 'bg-[#FFD54F] text-[#1e1e1e]' : 'bg-[#2a2a2a] text-white'}`}
			onclick={() => activeSection = 'cloud'}
		>
			Cloud Settings
		</button>
		<button
			class={`py-2 rounded-lg transition-colors ${activeSection === 'models' ? 'bg-[#FFD54F] text-[#1e1e1e]' : 'bg-[#2a2a2a] text-white'}`}
			onclick={() => activeSection = 'models'}
		>
			Model Management
		</button>
	</div>

	{#if activeSection === 'cloud'}
		<form 
		id="auth-card" 
		class="w-full max-w-md p-8 space-y-6 rounded-xl bg-[#1e1e1e] shadow-lg mb-4"
		method="post" 
		action="?/update-cloud-info" 
		use:enhance
	>	
		<div class="space-y-4">
			<div class="space-y-2">
				<label class="block text-sm font-medium text-[#FFD54F]">
					Cloud URL
					<input 
						name="cloud_url" 
                        autocomplete="cloud_url"
                        placeholder="https://cloud.example.com"
						class="w-full p-3 mt-1 text-white bg-[#2a2a2a] rounded-lg border border-[#404040] focus:ring-2 focus:ring-[#FFD54F] focus:ring-opacity-50 focus:outline-none transition-all"
					/>
				</label>
			</div>

			<div class="space-y-2">
				<label class="block text-sm font-medium text-[#FFD54F]">
					Cloud Token
					<input 
						name="cloud_token" 
                        autocomplete="cloud_token"
                        placeholder="your-cloud-token"
						class="w-full p-3 mt-1 text-white bg-[#2a2a2a] rounded-lg border border-[#404040] focus:ring-2 focus:ring-[#FFD54F] focus:ring-opacity-50 focus:outline-none transition-all"
					/>
				</label>
			</div>
		</div>

		<button 
			class="w-full py-3 px-4 bg-[#FFD54F] hover:bg-[#FFE55C] text-[#1e1e1e] font-semibold rounded-lg transition-colors"
		>
			Update Cloud Info
		</button>
	</form>
	{:else}
		<div 
			class="w-full max-w-md rounded-xl bg-[#1e1e1e] shadow-lg flex flex-col"
			style="height: {containerHeight}px"
		>
			<h2 class="text-[#FFD54F] text-xl font-semibold p-8 pb-4">Manage Models</h2>
			

			<div class="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
				{#each data.models as model (model.id)}
					<div class="flex flex-col p-4 bg-[#2a2a2a] rounded-lg space-y-3">
						<div class="flex justify-between items-center">
							<span class="text-white font-medium">{model.name}</span>
							<div class="text-sm text-gray-400">{model.ollamaName}</div>
						</div>
						
						<div class="flex justify-between items-center">
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-300">Local</span>
								<form method="POST" action="?/toggle-model" use:enhance>
									<input type="hidden" name="modelId" value={model.id} />
									<input type="hidden" name="type" value="local" />
									<label class="relative inline-flex items-center cursor-pointer">
										<input 
											type="checkbox" 
											class="sr-only peer" 
											checked={model.localEnabled}
										/>
										<div class="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-[#FFD54F] peer-focus:ring-2 peer-focus:ring-[#FFD54F] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
									</label>
								</form>
							</div>
							
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-300">Cloud</span>
								<form method="POST" action="?/toggle-model" use:enhance>
									<input type="hidden" name="modelId" value={model.id} />
									<input type="hidden" name="type" value="cloud" />
									<label class="relative inline-flex items-center cursor-pointer">
										<input 
											type="checkbox" 
											class="sr-only peer" 
											checked={model.cloudEnabled}
											disabled={!data.currentData.cloudUrl || !data.currentData.cloudKey}
										/>
										<div class="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-[#FFD54F] peer-focus:ring-2 peer-focus:ring-[#FFD54F] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
									</label>
								</form>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}


    {#if form?.success}
        <div
            transition:fade
            class="fixed top-4 left-1/2 -translate-x-1/2 bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg"
        >
            {form.message}
        </div>
    {:else if form?.message}
        <div
            transition:fade
            class="fixed top-4 left-1/2 -translate-x-1/2 bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg"
        >
            {form.message}
        </div>
    {/if}
</div> -->
