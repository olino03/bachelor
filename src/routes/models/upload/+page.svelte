<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';
    import { marked } from 'marked';

    let { data } = $props();

    let form = $state({
        name: '',
        username: '',
        displayDescription: '',
        description: '',
        tags: [],
        file: null
    });

    const toggleTag = (tagId) => {
        form.tags = form.tags.includes(tagId)
            ? form.tags.filter(id => id !== tagId)
            : [...form.tags, tagId];
    };

    let tagList = $derived(
        form.tags.map(tagId => 
            data.tags.find(t => t.id === tagId)?.name || ''
        ).filter(Boolean)
    );
    
    let fileSize = $derived(
        form.file ? (form.file.size / 1024 / 1024).toFixed(2) + ' MB' : ''
    );
    console.log(data);
</script>

<div class="max-w-[1600px] mx-auto p-8">
    <h1 class="text-3xl font-bold text-yellow-400 mb-8 text-center">Upload New Model</h1>

    <div class="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-8">
        <form
            use:enhance
            method="POST"
            action="?/upload"
            class="bg-[#1e1e1e] p-6 rounded-xl shadow-xl"
            enctype="multipart/form-data"
        >
            {#if $page.data.user}
                <input type="hidden" name="username" value={$page.data.user.username} />
            {/if}
            <div class="space-y-6">
                <div>
                    <label for="name" class="block text-yellow-400 font-medium mb-2">
                        Model Name
                    </label>
                    <input
                        id="name"
                        name="name"
                        bind:value={form.name}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 focus:ring-2 focus:ring-yellow-400 outline-none"
                        required
                    />
                </div>

                <div>
                    <label for="displayDescription" class="block text-yellow-400 font-medium mb-2">
                        Short Description
                    </label>
                    <textarea
                        id="displayDescription"
                        name="displayDescription"
                        bind:value={form.displayDescription}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 h-32 focus:ring-2 focus:ring-yellow-400 outline-none"
                    ></textarea>
                </div>

                <!-- Description -->
                <div>
                    <label for="description" class="block text-yellow-400 font-medium mb-2">
                        Description (Markdown)
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        bind:value={form.description}
                        class="w-full bg-[#121212] text-white rounded-lg p-3 h-48 font-mono focus:ring-2 focus:ring-yellow-400 outline-none"
                    ></textarea>
                </div>

                <div>
                    <span class="block text-yellow-400 font-medium mb-2">Select Tags</span>
                    <div class="flex flex-wrap gap-2">
                        {#each data.tags || [] as tag (tag.id)}
                            <button
                                type="button"
                                onclick={() => toggleTag(tag.id)}
                                class:bg-yellow-400={form.tags.includes(tag.id)}
                                class="px-3 py-1 rounded-full transition-colors
                                    {form.tags.includes(tag.id)
                                        ? 'bg-yellow-400 text-gray-900'
                                        : 'bg-[#121212] text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400'
                                    } focus:ring-2 focus:ring-yellow-400"
                                aria-pressed={form.tags.includes(tag.id)}
                            >
                                {tag.name}
                            </button>
                        {/each}
                    </div>
                    
                    <input type="hidden" name="tags" value={form.tags} />
                </div>


                <div>
                    <label for="file" class="block text-yellow-400 font-medium mb-2">
                        Model File
                    </label>  
                    <div class="relative">
                        <input
                            id="file"
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
                    Upload Model
                </button>

                {#if $page.form?.message && !$page.form?.success}
                    <div class="bg-red-700 text-red-100 p-4 rounded-lg text-center">
                        <span>{$page.form.message}</span>
                    </div>
                {/if}

                {#if $page.form?.success}
                    <div class="bg-green-700 text-green-100 p-4 rounded-lg text-center">
                        <span>{$page.form.message}</span>
                    </div>
                {/if}
            </div>
        </form>

        <div class="bg-[#1e1e1e] rounded-xl shadow-xl p-8 sticky top-4 h-[90vh] overflow-y-auto">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-yellow-400">
                    {form.name || 'Untitled Model'}
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
            </div>

            <div class="prose prose-invert max-w-none text-lg">
                {#if form.description}
                    {@html marked(form.description)}
                {:else}
                    <p class="text-gray-400 italic">No description provided</p>
                {/if}
            </div>

            <div class="mt-8 pt-6 border-t border-gray-700">
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
            </div>
        </div>
    </div>
</div>