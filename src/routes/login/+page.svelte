<script>
	import { enhance } from '$app/forms';

	let showPassword = $state(false);
	let { form } = $props();
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4">
	<form 
		id="auth-card" 
		class="w-full max-w-md p-8 space-y-6 rounded-xl bg-[#1e1e1e] shadow-lg mb-4"
		method="post" 
		action="?/login" 
		use:enhance
	>
		<h1 class="text-3xl font-bold text-center text-[#FFD54F]">Welcome back</h1>
		
		<div class="space-y-4">
			<div class="space-y-2">
				<label class="block text-sm font-medium text-[#FFD54F]">
					Username
					<input 
						name="username" 
                        autocomplete="username"
						class="w-full p-3 mt-1 text-white bg-[#2a2a2a] rounded-lg border border-[#404040] focus:ring-2 focus:ring-[#FFD54F] focus:ring-opacity-50 focus:outline-none transition-all"
					/>
				</label>
			</div>

			<div class="space-y-2">
				<label class="block text-sm font-medium text-[#FFD54F]">
					Password
					<div class="relative">
						<input 
							type={showPassword ? 'text' : 'password'}
							name="password"
							class="w-full p-3 pr-10 mt-1 text-white bg-[#2a2a2a] rounded-lg border border-[#404040] focus:ring-2 focus:ring-[#FFD54F] focus:ring-opacity-50 focus:outline-none transition-all"
						/>
						<button 
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#FFD54F] transition-colors"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
						>
							<i class={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
						</button>
					</div>
				</label>
			</div>
		</div>

		<button 
			class="w-full py-3 px-4 bg-[#FFD54F] hover:bg-[#FFE55C] text-[#1e1e1e] font-semibold rounded-lg transition-colors"
		>
			Login
		</button>

		<p class="text-center text-[#FFD54F]">
			New here? 
			<a href="/register" class="font-medium hover:underline hover:text-[#FFE55C]">
				Create account
			</a>
		</p>
	</form>
    {#if form?.message}
        <div class="w-full max-w-md p-8 space-y-6 rounded-xl bg-[#1e1e1e] shadow-lg">
            <p class="text-center text-red-700">{form?.message}</p>
        </div>
    {/if}
</div>