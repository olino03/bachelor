<script>
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';

	const { form, data } = $props();

	let activeSection = $state('models');
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

<div class="min-h-[95vh] flex flex-col items-center p-4 space-y-4">
	<div class="grid grid-cols-2 gap-2 w-full max-w-md">
		<button
			class={`py-2 rounded-lg transition-colors ${activeSection === 'cloud' ? 'bg-[#FFD54F] text-[#1e1e1e]' : 'bg-[#2a2a2a] text-white'}`}
			onclick={() => (activeSection = 'cloud')}
		>
			Cloud Settings
		</button>
		<button
			class={`py-2 rounded-lg transition-colors ${activeSection === 'models' ? 'bg-[#FFD54F] text-[#1e1e1e]' : 'bg-[#2a2a2a] text-white'}`}
			onclick={() => (activeSection = 'models')}
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
			enctype="multipart/form-data"
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
						Cloud Key (JSON File)
						<input
							type="file"
							name="cloud_key"
							accept="application/json"
							class="w-full p-3 mt-1 text-white bg-[#2a2a2a] rounded-lg border border-[#404040] focus:ring-2 focus:ring-[#FFD54F] focus:ring-opacity-50 focus:outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FFD54F] file:text-[#1e1e1e] hover:file:bg-[#FFE55C]"
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
			class="rounded-xl bg-[#1e1e1e] shadow-lg flex flex-col"
			style="height: {containerHeight}px"
		>
			<h2 class="text-[#FFD54F] text-xl font-semibold p-8 pb-4">Manage Models</h2>

			<h3 class="text-white text-md font-semibold px-8 pb-4">
				After clicking to enable models please be pacient for downloads to finish.
			</h3>

			<div class="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
				{#each data.models as models}
					<div class="space-y-4">
						<p class="text-white font-medium">{models.modelName}</p>
						<div class="flex flex-row gap-4">
							<!-- Local Section -->
							<div class="flex-1">
								<p class="text-white mb-2">Local</p>
								<div class="flex flex-row gap-6 flex-nowrap overflow-x-auto">
									{#each models.models as model}
										<div class="flex flex-col items-center flex-shrink-0">
											<p class="text-gray-400 text-sm mb-1 text-center truncate max-w-full">
												{model.ollamaName.split(':')[1]}
											</p>
											<form
												method="POST"
												action="?/toggle-model-local"
												use:enhance
												class="flex justify-center"
											>
												<input type="hidden" name="modelId" value={model.id} />
												<input type="hidden" name="type" value="local" />
												<button
													type="submit"
													class="w-6 h-6 rounded-md flex items-center justify-center transition-colors
														{model.localEnabled
														? 'bg-[#FFD54F] text-[#1e1e1e]'
														: 'bg-[#2a2a2a] text-gray-400 border border-[#404040]'}"
													aria-label="{model.localEnabled
														? 'Disable Local'
														: 'Enable Local'} for {model.ollamaName.split(':')[1]}"
												>
													<i class="{model.localEnabled ? 'fas fa-check' : 'far fa-square'} text-sm"
													></i>
												</button>
											</form>
										</div>
									{/each}
								</div>
							</div>

							<!-- Vertical Separator -->
							<div class="border-l border-gray-600 h-auto my-4"></div>

							<!-- Cloud Section -->
							<div class="flex-1">
								<p class="text-white mb-2">Cloud</p>
								<div class="flex flex-row gap-6 flex-nowrap overflow-x-auto">
									{#each models.models as model}
										<div class="flex flex-col items-center flex-shrink-0">
											<p class="text-gray-400 text-sm mb-1 text-center truncate max-w-full">
												{model.ollamaName.split(':')[1]}
											</p>
											<form
												method="POST"
												action="?/toggle-model-cloud"
												use:enhance
												class="flex justify-center"
											>
												<input type="hidden" name="modelId" value={model.id} />
												<input type="hidden" name="type" value="local" />
												<button
													type="submit"
													class="w-6 h-6 rounded-md flex items-center justify-center transition-colors
														{model.cloudEnabled
														? 'bg-[#FFD54F] text-[#1e1e1e]'
														: 'bg-[#2a2a2a] text-gray-400 border border-[#404040]'}"
													aria-label="{model.cloudEnabled
														? 'Disable Cloud'
														: 'Enable Cloud'} for {model.ollamaName.split(':')[1]}"
												>
													<i class="{model.cloudEnabled ? 'fas fa-check' : 'far fa-square'} text-sm"
													></i>
												</button>
											</form>
										</div>
									{/each}
								</div>
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
			class="fixed right-8 bottom-8 bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg"
		>
			{form.message}
		</div>
	{:else if form?.message}
		<div
			transition:fade
			class="fixed right-8 bottom-8 bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg"
		>
			{form.message}
		</div>
	{/if}
</div>
