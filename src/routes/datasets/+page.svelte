<script>
	import CardTile from "$lib/components/CardTile.svelte";
	// Data gotten from load
	export let data;

	let searchQuery = '';
	let datasets = data?.datasets;

	let itemsPerPage = 6;
	let currentPage = 1;

	$: filteredDatasets = datasets.filter(
		(dataset) =>
			dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			dataset.description.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Total number of pages
	$:  totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
		if (currentPage > totalPages) {
			currentPage = totalPages || 1; // Clamp to the last page or 1 if no datasets exist
		}

	// Get the datasets for the current page
	$: paginatedDatasets = filteredDatasets.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// Animation control
	let isLoading = false;

	// Navigate to the previous page
	async function goToPreviousPage() {
		if (currentPage > 1) {
			await reloadPage(() => currentPage--);
		}
	}

	// Navigate to the next page
	async function goToNextPage() {
		if (currentPage < totalPages) {
			await reloadPage(() => currentPage++);
		}
	}

	// Jump to a specific page
	async function goToPage(page) {
		const newPage = Math.min(Math.max(page, 1), totalPages); // Clamp page number
		if (newPage !== currentPage) {
			await reloadPage(() => (currentPage = newPage));
		}
	}

	// Reload animation
	function reloadPage(action) {
		isLoading = true;
		action(); // Perform the page change
		return new Promise((resolve) => {
			setTimeout(() => {
				isLoading = false;
				resolve();
			}, 500); // Duration of the animation
		});
	}
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
				<h3 class="text-[#f5f5f5] text-lg mb-2">Category</h3>
				<ul class="space-y-2">
					<li class="flex items-center gap-2">
						<input type="checkbox" class="w-5 h-5 border-2 border-[#FFD54F] rounded-sm bg-transparent appearance-none checked:bg-[#FFD54F]" />
						<span>AI Models</span>
					</li>
					<!-- Repeat for other checkboxes -->
				</ul>
			</div>

			<div class="mt-6">
				<h3 class="text-[#f5f5f5] text-lg mb-2">Metrics</h3>
				<ul class="space-y-2">
					<li class="flex items-center gap-2">
						<input type="checkbox" class="w-5 h-5 border-2 border-[#FFD54F] rounded-sm bg-transparent appearance-none checked:bg-[#FFD54F]" />
						<span>Most Popular</span>
					</li>
					<!-- Repeat for other checkboxes -->
				</ul>
			</div>

			<div class="mt-6 flex items-center gap-2">
				<label class="text-[#e0e0e0]">Show Datasets:</label>
				<select 
					bind:value={itemsPerPage}
					class="px-4 py-2 border border-[#FFD54F] rounded-lg bg-[#2c2c2c] text-white focus:ring-2 focus:ring-[#FFD54F] outline-none"
				>
					<option value="6">6</option>
					<option value="12">12</option>
					<option value="24">24</option>
				</select>
			</div>
		</div>
	</section>

	<div class="w-full">
		<section class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr)] gap-6 min-h-[300px]">
			{#if isLoading}
				<div class="border-4 border-[#e0e0e0] border-t-[#FFD54F] rounded-full w-10 h-10 animate-spin mx-auto my-8" />
			{:else}
				{#each paginatedDatasets as data}
					<CardTile {data} />
				{/each}
			{/if}
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

			<div class="bg-[#1e1e1e] text-[#e0e0e0] px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
				<label>Page</label>
				<input
					type="number"
					bind:value={currentPage}
					min="1"
					max={totalPages}
					onblur={(e) => goToPage(Number(e.target.value))}
					class="w-12 text-center border border-[#FFD54F] rounded bg-[#2c2c2c] text-white px-2 focus:outline-none focus:border-[#FFEA7C]"
				/>
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

<!-- <div class="main-container">
	<section class="filter-container">
		<div class="filter-card">
			<h2 class="filter-title">Filters</h2>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search datasets..."
				class="search-box"
			/>
			<div class="filter-category">
				<h3>Category</h3>
				<ul>
					<li><input type="checkbox" /> AI Models</li>
					<li><input type="checkbox" /> NLP Datasets</li>
					<li><input type="checkbox" /> Vision Datasets</li>
				</ul>
			</div>
			<div class="filter-metrics">
				<h3>Metrics</h3>
				<ul>
					<li><input type="checkbox" /> Most Popular</li>
					<li><input type="checkbox" /> Recently Added</li>
				</ul>
			</div>
			<div class="filter-metrics">
				<h3>Categories</h3>
				<ul>
					<li><input type="checkbox" /> Thingie</li>
					<li><input type="checkbox" /> Other Thingie</li>
				</ul>
			</div>
			<div class="dropdown-container">
				<label for="items-per-page">Show Datasets:</label>
				<select id="items-per-page" bind:value={itemsPerPage} class="dropdown">
					<option value="6">6</option>
					<option value="12">12</option>
					<option value="24">24</option>
				</select>
			</div>
		</div>
	</section>

	<div>
		<section class="cards-container">
			{#if isLoading}
				<div class="loading-spinner"></div>
			{:else}
				{#each paginatedDatasets as data}
					<CardTile {data} />
				{/each}
			{/if}
		</section>

		<section class="page-selector-container">
			{#if currentPage > 1}
				<button on:click={goToPreviousPage} class="page-button">← Backward</button>
			{/if}

			<div class="page-info">
				<label for="page-number">Page </label>
				<input
					id="page-number"
					type="number"
					bind:value={currentPage}
					min="1"
					max={totalPages}
					on:blur={(e) => goToPage(Number(e.target.value))}
					class="page-input"
				/>
				<span>of {totalPages}</span>
			</div>

			{#if currentPage < totalPages}
				<button on:click={goToNextPage} class="page-button">Forward →</button>
			{/if}
		</section>
	</div>
</div> -->

<!-- <style>
	/* Main Container */
	.main-container {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 2em;
		padding: 2em;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Dataset Cards */
	.cards-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5em;
		min-height: 300px; /* Maintain layout when loading */
	}

	/* Filters Section */
	.filter-container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	.filter-card {
		background: #1e1e1e;
		border-radius: 0.5em;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		padding: 1.5em;
		width: 100%;
		max-width: 300px;
		color: #e0e0e0;
	}

	.dropdown-container {
		margin-top: 1em;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.dropdown {
		padding: 0.5em 1em;
		border-radius: 0.5em;
		border: 1px solid #ffd54f;
		background: #2c2c2c;
		color: #f5f5f5;
		font-size: 1rem;
		outline: none;
		cursor: pointer;
	}

	.dropdown:focus {
		border-color: #ffea7c;
	}

	.search-box {
		width: 100%;
		padding: 0.6em 1em;
		border: none;
		border-radius: 0.5em;
		background: #2c2c2c;
		color: #f5f5f5;
		font-size: 0.9rem;
		margin-bottom: 1em;
		outline: none;
		transition: all 0.3s ease;
		box-sizing: border-box;
	}

	/* Loading Spinner */
	.loading-spinner {
		border: 4px solid #e0e0e0;
		border-top: 4px solid #ffd54f;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
		justify-self: center;
		align-self: center;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.page-selector-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1em;
		margin-top: 1.5em;
	}

	.page-button {
		background-color: #ffd54f;
		color: #1e1e1e;
		border: none;
		border-radius: 0.5em;
		padding: 0.6em 1em;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.page-button:hover {
		background-color: #ffea7c;
	}

	.page-info {
		display: flex;
		align-items: center;
		font-size: 1rem;
		color: #e0e0e0;
		background-color: #1e1e1e;
		padding: 0.6em 1em;
		border-radius: 0.5em;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	}

	.page-input {
		width: 50px;
		text-align: center;
		border: 1px solid #ffd54f;
		border-radius: 0.3em;
		background: #2c2c2c;
		color: #f5f5f5;
		margin: 0 0.5em;
		font-size: 1rem;
	}

	.page-input:focus {
		outline: none;
		border-color: #ffea7c;
	}

	.search-box:focus {
		background: #333;
		box-shadow: 0 0 4px #ffd54f;
	}

	.filter-title {
		margin: 0;
		padding-bottom: 1em;
		font-size: 1.5rem;
		color: #ffd54f;
		text-align: center;
	}

	.filter-category,
	.filter-metrics {
		margin-top: 1.5em;
	}

	h3 {
		font-size: 1.2rem;
		color: #f5f5f5;
		margin-bottom: 0.5em;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin: 0.5em 0;
		font-size: 1rem;
		color: #e0e0e0;
	}

	input[type='checkbox'] {
		appearance: none;
		width: 1.2em;
		height: 1.2em;
		border: 2px solid #ffd54f;
		border-radius: 0.3em;
		background: #1e1e1e;
		display: inline-block;
		cursor: pointer;
		position: relative;
		transition: all 0.2s ease-in-out;
	}

	input[type='checkbox']:hover {
		border-color: #ffea7c;
	}

	input[type='checkbox']:checked {
		background: #ffd54f;
		border-color: #ffd54f;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.main-container {
			grid-template-columns: 1fr;
		}

		.filter-container {
			margin-bottom: 2em;
		}

		.cards-container {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}
	}
</style> -->