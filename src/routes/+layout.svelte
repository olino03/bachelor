<script>
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	let { children } = $props();
</script>

<div class="min-h-screen flex flex-col">
	<Navbar />
	
	<main class="flex-1 container mx-auto max-w-6xl px-4 py-8">
		{@render children()}
	</main>
</div>