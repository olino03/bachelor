<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	const navLinks = [
		{ href: '/datasets', label: 'Datasets' },
		{ href: '/models', label: 'Models' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/inference', label: 'Inference' }
	];
</script>

<nav class="bg-[#1e1e1e] h-[5vh] flex px-4 items-center shadow-[0_2px_5px_rgba(0,0,0,0.3)] justify-between">
	<div class="flex items-center">
		<a href="/" class="text-[#ffd54f] font-bold text-lg mr-8">Logo</a>
	</div>

	<ul class="flex items-center list-none m-0 p-0 h-full flex-grow justify-center">
		{#each navLinks.filter(link => link.href !== $page.url.pathname) as { href, label }}
			<li class="mx-4">
				<a href={href} class="text-[#ffd54f] no-underline font-medium text-[0.9rem] transition-colors duration-200 hover:text-white">
					{label}
				</a>
			</li>
		{/each}
	</ul>

	<div class="flex items-center">
		{#if $page.data.user}
			<span class="text-[#ffd54f] font-medium mr-4">
				<i class="fa-solid fa-user mr-2"></i> {$page.data.user.username}
			</span>
			<form method="post" action="?/logout" use:enhance>
				<button class="text-[#ffd54f] text-[0.9rem] font-medium bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-white">
					Logout
				</button>
			</form>
		{:else}
			<a href="/login" class="text-[#ffd54f] no-underline font-medium mr-4 transition-colors duration-200 hover:text-white">
				Login
			</a>
			<a href="/register" class="text-[#ffd54f] no-underline font-medium  transition-colors duration-200 hover:text-white">
				Register
			</a>
		{/if}
	</div>
</nav>