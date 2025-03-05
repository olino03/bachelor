<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<h1>Login</h1>
<form method="post" action="?/login" use:enhance>
	<label>
		Username
		<input name="username" />
	</label>
	<label>
		Password
		<input type="password" name="password" />
	</label>
	<button>Login</button>
</form>
<p style="color: red">{form?.message ?? ''}</p>
