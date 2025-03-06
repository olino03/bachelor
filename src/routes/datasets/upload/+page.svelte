<script>
    // import { onMount } from 'svelte';
    // import MarkdownIt from 'markdown-it';

    // const md = new MarkdownIt();
    
    // let name = '';
    // let description = '';
    // let displayDescription = '';
    // let tags = '';
    // let file = null;
    // let error = '';
    // let success = '';

    // $: tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    // $: fileSize = file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '';

    // async function uploadDataset() {
    //     if (!file || !name) {
    //         error = 'Name and file are required';
    //         return;
    //     }

    //     const formData = new FormData();
    //     formData.append('name', name);
    //     formData.append('displayDescription', displayDescription);
    //     formData.append('description', description);
    //     formData.append('tags', tags);
    //     formData.append('file', file);

    //     try {
    //         const response = await fetch('/api/datasets/upload', {
    //             method: 'POST',
    //             body: formData
    //         });

    //         if (response.ok) {
    //             success = 'Dataset uploaded successfully!';
    //             error = '';
    //             name = description = tags = file = '';
    //         } else {
    //             const data = await response.json();
    //             error = data.error || 'Failed to upload dataset';
    //         }
    //     } catch (err) {
    //         error = 'Network error - failed to connect to server';
    //     }
    //}
</script>

<div class="upload-container">
    <h1 class="page-title">Upload New Dataset</h1>

    <div class="content-grid">
        <!-- Form Section -->
        <div class="form-section">
            <form on:submit|preventDefault={uploadDataset} class="upload-form">
                <div class="form-group">
                    <label for="name" class="form-label">Dataset Name</label>
                    <input type="text" id="name" bind:value={name} required class="form-input" placeholder="Enter dataset name"/>
                </div>

                <div class="form-group">
                    <label for="displayDescription" class="form-label">Display Description</label>
                    <textarea id="displayDescription" bind:value={displayDescription} class="form-textarea" placeholder="This will be displayed as the model's description"></textarea>
                </div>

                <div class="form-group">
                    <label for="description" class="form-label">Description</label>
                    <textarea id="description" bind:value={description} class="form-textarea" placeholder="## About this dataset&#10;Describe your dataset using markdown..."></textarea>
                </div>

                <div class="form-group">
                    <label for="tags" class="form-label">Tags</label>
                    <input type="text" id="tags" bind:value={tags} class="form-input" placeholder="comma, separated, tags"/>
                </div>

                <div class="form-group">
                    <label class="form-label">Dataset File</label>
                    <div class="file-upload">
                        <input type="file" id="file" on:change={(e) => file = e.target.files[0]} required class="file-input"/>
                        <label for="file" class="file-label">
                            {#if file}
                                {file.name} ({fileSize})
                            {:else}
                                Choose a file...
                            {/if}
                        </label>
                    </div>
                </div>

                <button type="submit" class="submit-button">Upload Dataset</button>
            </form>

            {#if error || success}
                <div class:notification-error={error} class:notification-success={success} class="notification">
                    {error || success}
                </div>
            {/if}
        </div>

        <!-- Dataset Preview Card -->
        <div class="dataset-card">
            <header class="card-header">
                <h2 class="dataset-title">{name || 'Untitled Dataset'}</h2>
                {#if tagList.length > 0}
                    <div class="tag-container">
                        {#each tagList as tag}
                            <span class="tag-pill">{tag}</span>
                        {/each}
                    </div>
                {/if}
            </header>

            <div class="card-content">
                {#if description}
                    {@html md.render(description)}
                {:else}
                    <p class="empty-description">No description provided</p>
                {/if}
            </div>

            <footer class="card-footer">
                <div class="file-meta">
                    <span class="file-icon">📁</span>
                    {#if file}
                        <span class="file-info">
                            <span class="file-name">{file.name}</span>
                            <span class="file-size">{fileSize}</span>
                        </span>
                    {:else}
                        <span class="no-file">No file selected</span>
                    {/if}
                </div>
            </footer>
        </div>
    </div>
</div>

<style>
    /* Base Styles */
    :global(body) {
        background: #121212;
        margin: 0;
        font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .upload-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1.5rem;
    }

    .page-title {
        color: #FFD700;
        text-align: center;
        margin: 0 0 2.5rem;
        font-size: 2.4rem;
        letter-spacing: -0.5px;
    }

    /* Grid Layout */
    .content-grid {
        display: grid;
        grid-template-columns: minmax(300px, 1fr) 400px;
        gap: 2.5rem;
        align-items: start;
    }

    /* Form Styles */
    .form-section {
        background: #1A1A1A;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .form-group {
        margin-bottom: 1.8rem;
    }

    .form-label {
        display: block;
        margin-bottom: 0.6rem;
        color: #FFD700;
        font-weight: 600;
        font-size: 0.95rem;
    }

    .form-input, .form-textarea {
        width: 100%;
        padding: 0.8rem;
        background: #2A2A2A;
        border: 1px solid #404040;
        border-radius: 8px;
        color: #EEE;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .form-input:focus, .form-textarea:focus {
        border-color: #FFD700;
        box-shadow: 0 0 0 3px rgba(255,215,0,0.1);
    }

    .form-textarea {
        height: 160px;
        resize: vertical;
        font-family: 'JetBrains Mono', monospace;
        line-height: 1.5;
    }

    /* File Upload */
    .file-upload {
        position: relative;
        margin-top: 0.5rem;
    }

    .file-input {
        display: none;
    }

    .file-label {
        display: block;
        padding: 1rem;
        background: #2A2A2A;
        border: 2px dashed #404040;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .file-label:hover {
        border-color: #FFD700;
        background: #252525;
    }

    /* Dataset Card */
    .dataset-card {
        background: #1A1A1A;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        position: sticky;
        top: 2rem;
        max-height: calc(100vh - 4rem);
        overflow: hidden;
    }

    .card-header {
        padding: 1.5rem;
        border-bottom: 1px solid #333;
    }

    .dataset-title {
        color: #FFD700;
        margin: 0 0 1rem;
        font-size: 1.6rem;
        line-height: 1.3;
    }

    .tag-container {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
    }

    .tag-pill {
        background: rgba(255,215,0,0.15);
        color: #FFD700;
        padding: 0.4rem 0.9rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
    }

    .card-content {
        padding: 1.5rem;
        flex-grow: 1;
        overflow-y: auto;
        line-height: 1.6;
    }

    .card-content :global(h1) {
        color: #FFD700;
        font-size: 1.4rem;
        margin: 1.5rem 0 1rem;
    }

    .card-content :global(h2) {
        font-size: 1.3rem;
        margin: 1.2rem 0 0.8rem;
    }

    .card-content :global(code) {
        background: rgba(255,215,0,0.1);
        color: #FFD700;
        padding: 0.2em 0.4em;
        border-radius: 4px;
    }

    .card-content :global(pre) {
        background: #2A2A2A;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
    }

    .empty-description {
        color: #666;
        font-style: italic;
        margin: 0;
    }

    .card-footer {
        padding: 1.5rem;
        background: #222;
        border-top: 1px solid #333;
    }

    .file-meta {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        color: #888;
    }

    .file-icon {
        font-size: 1.2rem;
    }

    .file-info {
        display: flex;
        flex-direction: column;
    }

    .file-name {
        color: #EEE;
        font-weight: 500;
        max-width: 300px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .file-size {
        font-size: 0.85rem;
    }

    /* Button & Notifications */
    .submit-button {
        width: 100%;
        padding: 1rem;
        background: #FFD700;
        color: #1A1A1A;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 1.5rem;
    }

    .submit-button:hover {
        background: #FFE55C;
    }

    .notification {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1.5rem;
        text-align: center;
    }

    .notification-error {
        background: #FEE2E2;
        color: #B91C1C;
    }

    .notification-success {
        background: #DCFCE7;
        color: #166534;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .content-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
        }

        .dataset-card {
            position: static;
            max-height: none;
        }

        .upload-container {
            padding: 1.5rem 1rem;
        }

        .form-section, .dataset-card {
            padding: 1.5rem;
        }
    }
</style>