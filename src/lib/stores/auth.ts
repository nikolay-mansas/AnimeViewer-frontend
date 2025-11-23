import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AuthState = {
	token: string | null;
};

const defaultState: AuthState = {
	token: null
};

function createAuthStore() {
	let initial = defaultState;

	if (browser) {
		const raw = localStorage.getItem('auth_token');
		initial = {
			token: raw ? raw : null
		};
	}

	const { subscribe, set, update } = writable<AuthState>(initial);

	if (browser) {
		subscribe((value) => {
			if (value.token) {
				localStorage.setItem('auth_token', value.token);
			} else {
				localStorage.removeItem('auth_token');
			}
		});
	}

	return {
		subscribe,
		setToken(token: string) {
			set({ token });
		},
		logout() {
			set(defaultState);
			if (browser) localStorage.removeItem('auth_token');
		},
		hasToken(): boolean {
			if (!browser) return false;
			const raw = localStorage.getItem('auth_token');
			return !!raw;
		},
		getToken(): string | null {
			return localStorage.getItem('auth_token');
		},
	};
}

export const auth = createAuthStore();