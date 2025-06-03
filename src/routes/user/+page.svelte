<script>
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    import { invalidateAll } from '$app/navigation'; 

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
            class="rounded-xl bg-[#1e1e1e] shadow-lg flex flex-col w-full max-w-2xl" style="height: {containerHeight}px"
        >
            <h2 class="text-[#FFD54F] text-xl font-semibold p-8 pb-4">Manage Models</h2>

            <h3 class="text-white text-md font-semibold px-8 pb-4">
                After clicking to enable models please be pacient for downloads to finish.
            </h3>

            <div class="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                {#if data.customModels && ( (data.customModels.local && data.customModels.local.length > 0) || (data.customModels.custom && data.customModels.custom.length > 0) )}
                    <div class="custom-models-section-container">
                        <h4 class="text-[#FFD54F] text-lg font-semibold mb-4 border-b border-gray-700 pb-2">Custom Models</h4>

                        {#if data.customModels.local && data.customModels.local.length > 0}
                            <div class="mb-4">
                                <h5 class="text-white text-md font-medium mb-3 text-opacity-90">Local</h5>
                                <div class="space-y-2">
                                    {#each data.customModels.local as item (item.modelName)}
                                        <div class="bg-[#2a2a2a] p-3 rounded-lg flex justify-between items-center shadow-md">
                                            <span class="text-white text-sm flex-1 truncate pr-2">{item.modelName}</span>
                                            <form
                                                method="POST"
                                                action="?/delete-custom-model-local"
                                                use:enhance={() => {
                                                    return async ({ result, update }) => {
                                                        if (result.type === 'success') {
                                                            await invalidateAll();
                                                        } else {
                                                             await update({ reset: false });
                                                        }
                                                    };
                                                }}
                                                class="m-0 flex-shrink-0"
                                            >
                                                <input type="hidden" name="modelName" value={item.modelName} />
                                                <button
                                                    type="submit"
                                                    class="w-6 h-6 rounded-md flex items-center justify-center transition-colors bg-[#4a4a4a] text-gray-300 hover:bg-red-600 hover:text-white border border-[#505050]"
                                                    aria-label="Delete local custom model {item.modelName}"
                                                >
                                                    <i class="fas fa-trash text-xs"></i>
                                                </button>
                                            </form>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if data.customModels.custom && data.customModels.custom.length > 0}
                            <div>
                                <h5 class="text-white text-md font-medium mb-3 text-opacity-90">Cloud</h5>
                                <div class="space-y-2">
                                    {#each data.customModels.custom as item (item.modelName)}
                                        <div class="bg-[#2a2a2a] p-3 rounded-lg flex justify-between items-center shadow-md">
                                            <span class="text-white text-sm flex-1 truncate pr-2">{item.modelName}</span>
                                            <form
                                                method="POST"
                                                action="?/delete-custom-model-cloud"
                                                use:enhance={() => {
                                                    return async ({ result, update }) => {
                                                        if (result.type === 'success') {
                                                            await invalidateAll();
                                                        } else {
                                                            await update({ reset: false });
                                                        }
                                                    };
                                                }}
                                                class="m-0 flex-shrink-0"
                                            >
                                                <input type="hidden" name="modelName" value={item.modelName} />
                                                <button
                                                    type="submit"
                                                    class="w-6 h-6 rounded-md flex items-center justify-center transition-colors bg-[#4a4a4a] text-gray-300 hover:bg-red-600 hover:text-white border border-[#505050]"
                                                    aria-label="Delete custom model {item.modelName}"
                                                >
                                                    <i class="fas fa-trash text-xs"></i>
                                                </button>
                                            </form>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                    {#if data.models && data.models.length > 0}
                        <hr class="border-gray-700 my-6" />
                    {/if}
                {/if}

                {#each data.models as models (models.modelName)}
                    <div class="space-y-4">
                        <h4 class="text-[#FFD54F] text-lg font-semibold mb-2 border-b border-gray-700 pb-2">{models.modelName}</h4>
                        <div class="grid md:grid-cols-2 gap-6">
                            <div class="flex-1">
                                <p class="text-white mb-2 text-opacity-90">Local Variants</p>
                                <div class="space-y-3">
                                    {#each models.models as model (model.id)}
                                        <div class="bg-[#2a2a2a] p-3 rounded-lg flex justify-between items-center shadow-md">
                                            <p class="text-gray-300 text-sm flex-1 truncate pr-2">
                                                {model.ollamaName.split(':')[1] || model.ollamaName}
                                            </p>
                                            <form
                                                method="POST"
                                                action="?/toggle-model-local"
                                                use:enhance
                                                class="flex justify-center m-0 flex-shrink-0"
                                            >
                                                <input type="hidden" name="modelId" value={model.id} />
                                                <input type="hidden" name="type" value="local" />
                                                <button
                                                    type="submit"
                                                    class="w-6 h-6 rounded-md flex items-center justify-center transition-colors
                                                        {model.localEnabled
                                                        ? 'bg-[#FFD54F] text-[#1e1e1e]'
                                                        : 'bg-[#3a3a3a] text-gray-400 border border-[#505050] hover:bg-[#4a4a4a]'}"
                                                    aria-label="{model.localEnabled
                                                        ? 'Disable Local'
                                                        : 'Enable Local'} for {model.ollamaName.split(':')[1] || model.ollamaName}"
                                                >
                                                    <i class="{model.localEnabled ? 'fas fa-check' : 'far fa-square'} text-xs"
                                                    ></i>
                                                </button>
                                            </form>
                                        </div>
                                    {/each}
                                </div>
                            </div>

                            <div class="flex-1">
                                <p class="text-white mb-2 text-opacity-90">Cloud Variants</p>
                                 <div class="space-y-3">
                                    {#each models.models as model (model.id + '-cloud')}
                                        <div class="bg-[#2a2a2a] p-3 rounded-lg flex justify-between items-center shadow-md">
                                            <p class="text-gray-300 text-sm flex-1 truncate pr-2">
                                                {model.ollamaName.split(':')[1] || model.ollamaName}
                                            </p>
                                            <form
                                                method="POST"
                                                action="?/toggle-model-cloud"
                                                use:enhance
                                                class="flex justify-center m-0 flex-shrink-0"
                                            >
                                                <input type="hidden" name="modelId" value={model.id} />
                                                <input type="hidden" name="type" value="cloud" />
                                                <button
                                                    type="submit"
                                                    class="w-6 h-6 rounded-md flex items-center justify-center transition-colors
                                                        {model.cloudEnabled
                                                        ? 'bg-[#FFD54F] text-[#1e1e1e]'
                                                        : 'bg-[#3a3a3a] text-gray-400 border border-[#505050] hover:bg-[#4a4a4a]'}"
                                                    aria-label="{model.cloudEnabled
                                                        ? 'Disable Cloud'
                                                        : 'Enable Cloud'} for {model.ollamaName.split(':')[1] || model.ollamaName}"
                                                >
                                                    <i class="{model.cloudEnabled ? 'fas fa-check' : 'far fa-square'} text-xs"
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
            transition:fade={{ duration: 300 }}
            class="fixed right-4 bottom-4 md:right-8 md:bottom-8 bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl text-sm"
        >
            {form.message}
        </div>
    {:else if form?.message}
        <div
            transition:fade={{ duration: 300 }}
            class="fixed right-4 bottom-4 md:right-8 md:bottom-8 bg-red-600 text-white px-5 py-3 rounded-lg shadow-xl text-sm"
        >
            {form.message}
        </div>
    {/if}
</div>
