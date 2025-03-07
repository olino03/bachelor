<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { marked } from 'marked';
    
    let { data } = $props();

    let form = $state({
        name: '',
        username: '',
        shortDescription: '',
        description: '',
        tags: [],
        file: null
    });

    let submission = $state({
        error: '',
        success: ''
    });

    let tagList = $derived(form.tags.map(tag => tags.find(t => t.name === tag).name));
    let fileSize = $derived(form.file ? (form.file.size / 1024 / 1024).toFixed(2) + ' MB' : '');
</script>

<div class="max-w-[1600px] mx-auto p-8">
    <h1 class="text-3xl font-bold text-yellow-400 mb-8 text-center">Upload New Dataset</h1>

    <div class="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-8">
        <!-- Form Section -->
        <form
            use:enhance
            method="POST"
            action="?/upload"
            class="bg-[#1e1e1e] p-6 rounded-xl shadow-xl"
        >
            {#if $page.data.user}
                <input type="hidden" name="username" value={$page.data.user.username} />
            {/if}
            <div class="space-y-6">
                <div>
                    <label for="name" 
                    class="block text-yellow-400 font-medium mb-2">Dataset Name</label>
                    <input
                        name="name"
                        bind:value={form.name}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 focus:ring-2 focus:ring-yellow-400 outline-none"
                        required
                    />
                </div>

                <div>
                    <label for="shortDescription"
                    class="block text-yellow-400 font-medium mb-2">Short Description</label>
                    <textarea
                        name="shortDescription"
                        bind:value={form.shortDescription}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 h-32 focus:ring-2 focus:ring-yellow-400 outline-none"
                    ></textarea>
                    
                </div>

                <div>
                    <label for="description"
                    class="block text-yellow-400 font-medium mb-2">Description (Markdown)
                    <textarea
                        name="description"
                        bind:value={form.description}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 h-48 font-mono focus:ring-2 focus:ring-yellow-400 outline-none"
                        ></textarea>
                    </label>
                </div>

                <div>
                    <span class="block text-yellow-400 font-medium mb-2">Select Tags</span>
                    <div class="flex flex-wrap gap-2">
                        {#each data.tags } <!-- Handle undefined tags -->
                            <button
                                type="button"
                                onclick={() => toggleTag(tag.name)} 
                                class="px-3 py-1 rounded-full transition-colors
                                    {form.tags.includes(tag.name) 
                                        ? 'bg-yellow-400 text-gray-900' 
                                        : 'bg-[#121212] text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400'
                                    } 
                                    focus:ring-2 focus:ring-yellow-400"
                                aria-pressed={form.tags.includes(tag.name)}
                            >
                                {tag.name}
                            </button>
                        {/each}
                    </div>
                    
                    <!-- Hidden inputs for form submission -->
                    {#each form.tags as tag}
                        <input type="hidden" name="tags" value={tag} />
                    {/each}
                </div>

                <div>
                    <label for="file"
                    class="block text-yellow-400 font-medium mb-2">Dataset File</label>  
                    <div class="relative">
                        <input
                            name="file"
                            type="file"
                            class="absolute opacity-0 w-full h-full cursor-pointer"
                            onchange={(e) => form.file = e.target.files[0]}
                            required
                        />
                        <div class="bg-[#121212] rounded-lg p-4 border-2 border-dashed border-gray-500 hover:border-yellow-400 transition-colors">
                            {#if form.file}
                                <span class="text-white">{form.file.name} ({fileSize})</span>
                            {:else}
                                <span class="text-gray-400">Choose a file...</span>
                            {/if}
                        </div>
                    </div>
                </div>
                

                <button
                    type="submit"
                    class="w-full bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                    Upload Dataset
                </button>

                {#if submission.error || submission.success}
                    <div class:bg-red-100={submission.error} class:bg-green-100={submission.success} class="p-4 rounded-lg">
                        <span class:text-red-700={submission.error} class:text-green-700={submission.success}>
                            {submission.error || submission.success}
                        </span>
                    </div>
                {/if}
            </div>
        </form>

        <!-- Preview Section -->
        <div class="bg-[#1e1e1e] rounded-xl shadow-xl p-8 sticky top-4 h-[90vh] overflow-y-auto">
            <header class="mb-6">
                <h2 class="text-3xl font-bold text-yellow-400">
                    {form.name || 'Untitled Dataset'}
                </h2>
                {#if tagList.length > 0}
                    <div class="flex flex-wrap gap-2 mt-4">
                        {#each tagList as tag}
                            <span class="px-3 py-1 bg-yellow-400/10 text-yellow-400 rounded-full text-sm">
                                {tag}
                            </span>
                        {/each}
                    </div>
                {/if}
            </header>

            <div class="prose prose-invert max-w-none text-lg">
                {#if form.description}
                    <div class="preview">{@html marked(form.description)}</div>
                {:else}
                    <p class="text-gray-400 italic">No description provided</p>
                {/if}
            </div>

            <footer class="mt-8 pt-6 border-t border-gray-700">
                <div class="flex items-center gap-3 text-gray-400">
                    <i class="fa-solid fa-folder text-[#FFD54F]"></i>
                    {#if form.file}
                        <div>
                            <p class="text-white text-xl truncate">{form.file.name}</p>
                            <p class="text-lg">{fileSize}</p>
                        </div>
                    {:else}
                        <span class="text-gray-500 text-lg">No file selected</span>
                    {/if}
                </div>
            </footer>
        </div>
    </div>
</div>