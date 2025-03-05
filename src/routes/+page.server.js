import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { fail } from '@sveltejs/kit';

export const actions = {
    logout: async (event) => {
        if (!event.locals.session) {
            return fail(401);
        }
        await auth.invalidateSession(event.locals.session.id);
        auth.deleteSessionTokenCookie(event);

        throw redirect(302, '/');
    }
};