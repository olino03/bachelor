<script>
	import { marked } from 'marked';
	import { page } from '$app/stores';

	let { data } = $props();

	let isHearted = $state(false);
	let downloadCount = $state(data.model.downloads);
	let heartCount = $state(data.model.hearts);

	const toggleHeart = () => {
		isHearted = !isHearted;
		heartCount += isHearted ? 1 : -1;
	};

	const toggleDownload = async () => {
		try {
			const res = await fetch(`${page.params.modelID}/download/`);
			if (!res.ok) return;

			let fileName = '';
			const contentDisposition = res.headers.get('Content-Disposition');
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
				if (filenameMatch?.[1]) fileName = filenameMatch[1];
			}

			const newCount = res.headers.get('X-Download-Count');
			if (newCount) downloadCount = parseInt(newCount, 10);

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download failed:', error);
		}
	};
</script>

<div class="max-w-[1600px] mx-auto p-8">
	<div class="grid grid-cols-1 xl:grid-cols-[3fr_1fr] gap-8">
		<!-- Left Card -->
		<div class="bg-[#1e1e1e] rounded-xl shadow-xl p-8 sticky top-4 h-min">
			<div class="flex flex-col gap-6">
				<div class="mb-4">
					<h1 class="text-4xl font-bold text-yellow-400 mb-2">
						{data.model.name}
					</h1>
					<div class="flex flex-wrap gap-2 mt-2">
						{#each data.model.tags as tag}
							<span class="px-3 py-1 bg-yellow-400/10 text-yellow-400 rounded-full">
								{tag.name}
							</span>
						{/each}
					</div>
				</div>

				<div class="prose prose-invert max-w-none text-lg">
					{@html marked(data.model.description)}
				</div>

				<div class="mt-6 pt-6 border-t border-gray-700">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<button
								onclick={toggleHeart}
								class={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                                    ${isHearted ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-gray-700'}`}
							>
								<i class={`fa-solid fa-heart text-lg`}></i>
								<span class="font-medium">{heartCount}</span>
							</button>
							<button
								onclick={toggleDownload}
								class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-700"
							>
								<i class="fa-solid fa-download text-lg"></i>
								<span class="font-medium">{downloadCount}</span>
							</button>
						</div>
					</div>
				</div>

				{#if $page.data.user?.username === data.model.uploader}
					<div class="mt-6 pt-6 border-t border-gray-700">
						<a
							href="/models/{data.model.id}/edit"
							class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
						>
							<i class="fa-solid fa-pencil mr-2"></i>
							Edit Model
						</a>
					</div>
				{/if}
			</div>
		</div>

		<div class="bg-[#1e1e1e] h-min rounded-xl shadow-xl p-8">
			<h2 class="text-2xl font-bold text-yellow-400 mb-6">Model Details</h2>

			<div class="grid grid-cols-1 gap-4 text-gray-300">
				<div class="p-4 bg-[#121212] rounded-lg">
					<p class="text-sm text-gray-400">Uploaded by</p>
					<p class="text-lg font-medium text-white">{data.model.uploadedBy}</p>
				</div>
				<div class="p-4 bg-[#121212] rounded-lg">
					<p class="text-sm text-gray-400">Upload Date</p>
					<p class="text-lg font-medium text-white">
						{new Date(data.model.createdAt).toLocaleDateString()}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
