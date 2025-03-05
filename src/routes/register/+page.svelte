<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<h1>Register</h1>
<form method="post" action="?/register" use:enhance>
	<label>
		Username
		<input name="username" />
	</label>
	<label>
		Password
		<input type="password" name="password" />
	</label>
	<button>Register</button>
</form>
<p style="color: red">{form?.message ?? ''}</p>
