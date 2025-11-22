import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AuthState = {
	token: string | null;
	username: string | null;
};

const defaultState: AuthState = {
	token: null,
	username: null
};

function createAuthStore() {
	let initial = defaultState;

	if (browser) {
		const raw = localStorage.getItem('auth');
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === 'object') {
					initial = {
						token: parsed.token ?? null,
						username: parsed.username ?? null
					};
				}
			} catch {
				initial = defaultState;
			}
		}
	}

	const { subscribe, set } = writable<AuthState>(initial);

	if (browser) {
		subscribe((value) => {
			localStorage.setItem('auth', JSON.stringify(value));
		});
	}

	return {
		subscribe,
		set,
		logout() {
			set(defaultState);
			if (browser) {
				localStorage.removeItem('auth');
			}
		}
	};
}

export const auth = createAuthStore();