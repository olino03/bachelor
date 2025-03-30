<script>
	let { data } = $props();

	let searchQuery = $state('');
	let itemsPerPage = $state('6'); // This is some JS bullshit
	let currentPage = $state(1);
	let selectedMetric = $state('most-popular');
	let selectedTags = $state([]);

	const sortModels = (models) => {
		if (selectedMetric === 'most-popular') {
			return [...models].sort((a, b) => b.downloads - a.downloads);
		}
		if (selectedMetric === 'most-hearts') {
			return [...models].sort((a, b) => b.hearts - a.hearts);
		}
		if (selectedMetric === 'recent') {
			return [...models].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		}
		return models;
	};

	let orderedModel = $derived(
		sortModels(data.models).filter(model => 
			(model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			model.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
			(selectedTags.length === 0 || 
			 selectedTags.every(tag => 
				model.tags.some(modelTag => modelTag.name === tag)
			))
		)
	);

	let totalPages = $derived(Math.ceil(orderedModel.length / itemsPerPage));
	let startIndex = $derived((currentPage - 1) * itemsPerPage);
	let endIndex = $derived(startIndex + itemsPerPage);
	let paginatedmodels = $derived(orderedModel.slice(startIndex, endIndex));

	const goToPreviousPage = () => currentPage > 1 && currentPage--;
	const goToNextPage = () => currentPage < totalPages && currentPage++;
	const goToPage = (page) => {
		const newPage = Math.max(1, Math.min(page, totalPages));
		currentPage = newPage;
	};
</script>

<div class="w-full grid sm:grid-cols-[1fr_1fr] md:grid-cols-[1fr_3fr] gap-8 p-8 max-w-7xl mx-auto">
	<section class="flex justify-center items-start">
		<div class="bg-[#1e1e1e] rounded-lg shadow-md p-6 w-full min-w-[260px] text-[#e0e0e0]">
			<h2 class="text-[#FFD54F] text-xl font-bold text-center pb-4">Filters</h2>

			<div>
				<h3 class="text-[#f5f5f5] text-lg mb-2">Sort By</h3>
				<select
					class="w-full p-2 bg-[#2c2c2c] text-white border border-[#FFD54F] rounded-lg focus:ring-2 focus:ring-[#FFD54F] focus:outline-none"
					bind:value={selectedMetric}
				>
					<option value="most-popular" selected="selected">Most Popular</option>
					<option value="most-hearts">Most Hearts</option>
					<option value="recent">Recently Added</option>
				</select>
			</div>

			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search models..."
				class="mt-6 w-full px-4 py-2 bg-[#2c2c2c] border border-[#FFD54F] text-white rounded-lg focus:ring-2 focus:ring-[#FFD54F] focus:outline-none transition-all"
			/>

			<div class="mt-6">
				<h3 class="text-[#f5f5f5] text-lg mb-2">Tags</h3>
				<ul class="space-y-2">
					{#each data.tags as tag}
						<li class="flex items-center gap-2">
							<input
							type="checkbox"
							class="w-5 h-5 border-2 border-[#FFD54F] rounded-sm bg-transparent appearance-none checked:bg-[#FFD54F] focus:ring-2 focus:ring-[#FFD54F] focus:outline-none"
							bind:group={selectedTags}
							value={tag.name}
						/>
							<span>{tag.name}</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-6 flex items-center gap-2">
				<label class="text-[#e0e0e0]">Items per page:</label>
				<select
					bind:value={itemsPerPage}
					onchange={() => currentPage = 1}
					class="w-20 px-4 py-2 border border-[#FFD54F] rounded-lg bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#FFD54F] outline-none accent-yellow"
				>
					<option value="6" selected="selected">6</option>
					<option value="12">12</option>
					<option value="24">24</option>
				</select>
			</div>
			<button class="mt-6 p-4 rounded-lg w-full bg-[#ffe54f] text-[#1e1e1e]"><a href='/models/upload'>Upload your own</a></button>
		</div>
	</section>

	<div class="w-full">
		<section class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#if paginatedmodels.length > 0}
				{#each paginatedmodels as model}
					<div class="bg-[#1e1e1e] rounded-lg shadow-sm p-6 mb-6">
						<a href={`/models/${model.id}`}>
						<h1 class="text-xl font-semibold text-[#FFD54F] mb-3">
							{model.name}
						</h1>
						<p class="text-sm text-[#f5f5f5] mb-4 leading-normal">
							{model.description}
						</p>
						<div class="flex gap-6 pt-3 border-t border-gray-200">
							<div class="flex gap-2 items-center">
								<p class="text-lg font-semibold text-white">
									{model.hearts}
								</p>
								<i class="fa-solid fa-heart text-[#FFD54F]"></i>
							</div>
							<div class="flex items-center gap-2">
								<p class="text-lg font-semibold text-white">
									{model.downloads}
								</p>
								<i class="fa-solid fa-download text-[#FFD54F]"></i>
							</div>
						</div>
						</a>
					</div>
				{/each}
			{:else}
				<p class="text-[#FFD54F] text-lg">No models found</p>
			{/if}
		</section>

		{#if totalPages > 1}
			<section class="flex justify-center items-center gap-4 mt-6">
				{#if currentPage > 1}
					<button
						onclick={goToPreviousPage}
						class="bg-[#FFD54F] text-[#1e1e1e] px-4 py-2 rounded-lg hover:bg-[#FFEA7C] transition-colors"
					>
					<i class="fa-solid fa-arrow-left"></i>
					</button>
				{/if}

				<div class="bg-[#1e1e1e] text-[#e0e0e0] px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
					<label>
						Page
						<input
							type="number"
							bind:value={currentPage}
							min="1"
							max={totalPages}
							onblur={(e) => goToPage(Number(e.target.value))}
							class="w-12 text-center border border-[#FFD54F] rounded bg-[#2c2c2c] text-white px-2 focus:outline-none focus:border-[#FFEA7C]"
						/>
					</label>
					<span>of {totalPages}</span>
				</div>

				{#if currentPage < totalPages}
					<button
						onclick={goToNextPage}
						class="bg-[#FFD54F] text-[#1e1e1e] px-4 py-2 rounded-lg hover:bg-[#FFEA7C] transition-colors"
					>
						<i class="fa-solid fa-arrow-right"></i>
					</button>
				{/if}
			</section>
		{/if}
	</div>
</div>
