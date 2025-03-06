<script>
	import '../app.css';
	import '@fortawesome/fontawesome-free/css/all.min.css'
	import Navbar from '$lib/components/Navbar.svelte';
	let { children } = $props();
</script>

<div class="min-h-screen flex flex-col bg-[#121212]">
	<Navbar />
	{@render children()}
</div>