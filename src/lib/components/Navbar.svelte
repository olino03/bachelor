<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
</script>

<nav class="bg-gray-100 p-4 shadow-md">
	<div class="container mx-auto max-w-6xl px-4 flex justify-between items-center">
		<a href="/" class="text-gray-900 font-bold hover:text-gray-600 transition-colors">
			Your Logo
		</a>

		<div class="flex items-center gap-6">
			{#if $page.data.user}
				<div class="flex items-center gap-4">
					<span class="text-gray-700">
						Welcome, <span class="font-semibold">{$page.data.user.username}</span>
					</span>
					<form method="post" action="?/logout" use:enhance>
						<button class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors">
							Logout
						</button>
					</form>
				</div>
			{:else}
				<div class="flex gap-4">
					<a href="/login" class="text-gray-700 hover:text-gray-900 transition-colors">
						Login
					</a>
					<a href="/register" class="text-gray-700 hover:text-gray-900 transition-colors">
						Register
					</a>
				</div>
			{/if}
		</div>
	</div>
</nav>