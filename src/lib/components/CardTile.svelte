<script>
    export let data;
</script>

<div class="card">
    <h1 class="card-title">{data.name}</h1>
    <p class="card-description">{data.description}</p>
    <div class="card-stats">
        <div class="stat">
            <p class="stat-value">{data.datapoints}</p>
            <p class="stat-label">Datapoints</p>
        </div>
        <div class="stat">
            <p class="stat-value">{data.hearts}</p>
            <p class="stat-label">Hearts</p>
        </div>
        <div class="stat">
            <p class="stat-value">{data.downloads}</p>
            <p class="stat-label">Downloads</p>
        </div>
    </div>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400&family=Ubuntu:wght@300&display=swap');

    .card {
        margin: 1rem auto;
        padding: 1.5rem;
        background: #1e1e1e; /* Dark background */
        border-radius: 0.5rem;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3); /* Subtle shadow */
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
        transform: scale(1.03);
        box-shadow: 0 0.75rem 1.5rem rgba(0, 0, 0, 0.4);
    }

    .card-title {
        font-size: 1.5rem;
        font-family: 'Roboto Mono', monospace;
        font-weight: 400;
        color: #ffd54f; /* Highlight color */
        word-wrap: break-word;
    }

    .card-description {
        font-size: 1rem;
        font-family: 'Ubuntu', sans-serif;
        font-weight: 300;
        color: #e0e0e0; /* Lighter gray text */
        line-height: 1.5;
        word-wrap: break-word;
    }

    .card-stats {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        color: #bdbdbd; /* Secondary text color */
    }

    .stat {
        text-align: center;
        flex: 1;
    }

    .stat-value {
        font-size: 1.1rem;
        font-weight: bold;
        color: #ffffff; /* White for emphasis */
    }

    .stat-label {
        font-size: 0.8rem;
        color: #bdbdbd; /* Slightly muted */
    }

    @media (max-width: 600px) {
        .card {
            padding: 1rem;
        }

        .card-title {
            font-size: 1.25rem;
        }

        .card-description {
            font-size: 0.9rem;
        }

        .card-stats {
            justify-content: space-between;
        }
    }
</style>
