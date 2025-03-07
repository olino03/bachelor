<script>
	import CardTile from '$lib/components/CardTile.svelte';

	let {data} = $props();

	let searchQuery = $state('');
	let itemsPerPage = $state(6);
	let currentPage = $state(1);
	let selectedMetric = $state('');
	
	let orderedDataset = $derived(() => {
		const sorted = [...data.datasets]; 
		if (selectedMetric === 'most-popular' || selectedMetric === 'most-hearts') {
			return sorted.sort((a, b) => b.hearts - a.hearts);
		} else if (selectedMetric === 'recent') {
			return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		}
		return sorted;
	});
	let totalPages = $derived(data.datasets?.length ? datasets.length / itemsPerPage : 1);
</script>

<div class="grid grid-cols-[1fr_3fr] gap-8 p-8 max-w-7xl mx-auto">
	<section class="flex justify-center items-start">
		<div class="bg-[#1e1e1e] rounded-lg shadow-md p-6 w-full max-w-xs text-[#e0e0e0]">
			<h2 class="text-[#FFD54F] text-xl font-bold text-center pb-4">Filters</h2>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search datasets..."
				class="w-full px-4 py-2 bg-[#2c2c2c] text-white rounded-lg mb-4 focus:ring-2 focus:ring-[#FFD54F] focus:outline-none transition-all"
			/>

			<div class="mt-6">
				<h3 class="text-[#f5f5f5] text-lg mb-2">Tags</h3>
				<ul class="space-y-2">
					{#each data.tags as data}
						<li class="flex items-center gap-2">
							<input
								type="checkbox"
								class="w-5 h-5 border-2 border-[#FFD54F] rounded-sm bg-transparent appearance-none checked:bg-[#FFD54F]"
							/>
							<span>{data.name}</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-6">
				<h3 class="text-[#f5f5f5] text-lg mb-2">Sort By</h3>
				<select 
					class="w-full p-2 bg-[#2c2c2c] text-white border border-[#FFD54F] rounded-lg focus:ring-2 focus:ring-[#FFD54F] focus:outline-none"
					bind:value={selectedMetric}
				>
					<option value="most-popular">Most Popular</option>
					<option value="most-hearts">Most Hearts</option>
					<option value="recent">Recently Added</option>
				</select>
			</div>

			<div class="mt-6 flex items-center gap-2">
				<label class="text-[#e0e0e0]"
					>Show Datasets:
					<select
						bind:value={itemsPerPage}
						class="px-4 py-2 border border-[#FFD54F] rounded-lg bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#FFD54F] outline-none"
					>
						<option value="6">6</option>
						<option value="12">12</option>
						<option value="24">24</option>
					</select>
				</label>
			</div>

			
		</div>
	</section>

	<div class="w-full">
		<section class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr)] gap-6 min-h-[300px]">
			{#each data.datasets as dataset}
				<CardTile {dataset} />
			{/each}
		</section>

		<section class="flex justify-center items-center gap-4 mt-6">
			{#if currentPage > 1}
				<button
					onclick={goToPreviousPage}
					class="bg-[#FFD54F] text-[#1e1e1e] px-4 py-2 rounded-lg hover:bg-[#FFEA7C] transition-colors"
				>
					← Backward
				</button>
			{/if}

			<div
				class="bg-[#1e1e1e] text-[#e0e0e0] px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
			>
				<label
					>Page
					<input
						type="number"
						bind:value={currentPage}
						min="1"
						max={totalPages}
						onblur={(e) => goToPage(Number(e.target.value))}
						class="w-12 text-center border border-[#FFD54F] rounded bg-[#2c2c2c] text-white px-2 focus:outline-none focus:border-[#FFEA7C]"
					/></label
				>
				<span>of {totalPages}</span>
			</div>

			{#if currentPage < totalPages}
				<button
					onclick={goToNextPage}
					class="bg-[#FFD54F] text-[#1e1e1e] px-4 py-2 rounded-lg hover:bg-[#FFEA7C] transition-colors"
				>
					Forward →
				</button>
			{/if}
		</section>
	</div>
</div>
