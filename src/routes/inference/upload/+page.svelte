<script>
    import { page } from '$app/stores';
    import { enhance } from '$app/forms';

    let { data } = $props();

    let form = $state({
        name: '',
        ggufFile: null,
        modelfileFile: null,
        uploadToCloud: false
    });

    let modelfileError = $state(null);

    const handleModelfile = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 1024 * 1024) {
            modelfileError = 'Modelfile must be smaller than 1MB';
            form.modelfileFile = null;
            e.target.value = '';
        } else {
            modelfileError = null;
            form.modelfileFile = file;
        }
    };
    
    if (data?.canUploadToCloud) {
        form.uploadToCloud = true;
    }

    console.log('Page data:', data);
</script>

<div class="max-w-3xl mx-auto p-8">
    <form
        use:enhance
        method="POST"
        action="?/upload"
        class="bg-[#1e1e1e] p-8 rounded-xl shadow-xl space-y-8"
        enctype="multipart/form-data"
    >
        <h1 class="text-3xl font-bold text-yellow-400 text-center mb-6">Upload New Model</h1>

        {#if $page.data.user}
            <input type="hidden" name="username" value={$page.data.user.username} />
        {/if}

        <div>
            <label for="name" class="block text-yellow-400 font-medium mb-3">Model Name</label>
            <input
                id="name"
                name="name"
                bind:value={form.name}
                class="w-full bg-[#121212] text-white rounded-lg p-3 focus:ring-2 focus:ring-yellow-400 outline-none"
                placeholder="Enter model name"
                required
            />
        </div>

        <div class="flex flex-col md:flex-row gap-6 min-h-[300px]">
            <div class="flex-1 flex flex-col">
                <label class="block text-yellow-400 font-medium mb-3">GGUF Model File</label>
                <div class="relative group h-full">
                    <input
                        id="gguf"
                        name="gguf"
                        type="file"
                        accept=".gguf"
                        class="absolute opacity-0 w-full h-full cursor-pointer"
                        onchange={(e) => form.ggufFile = e.target.files[0]}
                        required
                    />
                    <div class="bg-[#121212] rounded-lg p-6 border-2 border-dashed border-gray-600 group-hover:border-yellow-400 transition-all h-full flex flex-col justify-center">
                        <div class="flex items-center gap-4 text-yellow-400">
                            <i class="fa-solid fa-cube text-3xl"></i>
                            <div class="flex-1">
                                {#if form.ggufFile}
                                    <p class="text-white font-medium truncate">{form.ggufFile.name}</p>
                                    <p class="text-sm">{(form.ggufFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                {:else}
                                    <p class="text-yellow-400">Select GGUF File</p>
                                    <p class="text-sm text-gray-400">No size limit</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex-1 flex flex-col">
                <label class="block text-yellow-400 font-medium mb-3">Modelfile (Optional)</label>
                <div class="relative group h-full">
                    <input
                        id="modelfile"
                        name="modelfile"
                        type="file"
                        accept=".Modelfile" 
                        class="absolute opacity-0 w-full h-full cursor-pointer"
                        onchange={handleModelfile}
                    />
                    <div class="bg-[#121212] rounded-lg p-6 border-2 border-dashed border-gray-600 group-hover:border-yellow-400 transition-all h-full flex flex-col justify-center">
                        <div class="flex items-center gap-4 text-yellow-400">
                            <i class="fa-solid fa-file-code text-3xl"></i>
                            <div class="flex-1">
                                {#if form.modelfileFile}
                                    <p class="text-white font-medium truncate">{form.modelfileFile.name}</p>
                                    <p class="text-sm">{(form.modelfileFile.size / 1024).toFixed(2)} KB</p>
                                {:else}
                                    <p class="text-yellow-400">Select Modelfile</p>
                                    <p class="text-sm text-gray-400">Max 1MB</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
                {#if modelfileError}
                    <p class="text-red-400 text-sm mt-2">{modelfileError}</p>
                {/if}
            </div>
        </div>

        {#if data?.canUploadToCloud}
            <div class="flex items-center mt-6">
                <input
                    id="uploadToCloud"
                    name="useCloud" type="checkbox"
                    value="true"   bind:checked={form.uploadToCloud}
                    class="h-5 w-5 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-offset-gray-800 cursor-pointer"
                />
                <label for="uploadToCloud" class="ml-3 text-yellow-400 font-medium cursor-pointer">
                    Upload to the cloud
                </label>
            </div>
        {/if}

        <button
            type="submit"
            class="w-full bg-yellow-400 text-gray-900 font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2 mt-6"
        >
            <i class="fa-solid fa-cloud-arrow-up"></i>
            Upload Model
        </button>

        {#if $page.form?.message && !$page.form?.success}
            <div class="bg-red-700 text-red-100 p-4 rounded-lg text-center">
                {$page.form.message}
            </div>
        {/if}

        {#if $page.form?.success}
            <div class="bg-green-700 text-green-100 p-4 rounded-lg text-center">
                {$page.form.message}
            </div>
        {/if}
    </form>
</div>  