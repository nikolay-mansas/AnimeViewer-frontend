import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AuthState = {
	token: string | null;
};

const defaultState: AuthState = {
	token: null
};

function getCookieToken() {
	if (!browser) return null;
	const row = document.cookie.split('; ').find((row) => row.startsWith('auth_token='));
	return row ? decodeURIComponent(row.split('=')[1]) : null;
}

function createAuthStore() {
	let initial = defaultState;

	if (browser) {
		const rawCookie = getCookieToken();
		const rawLocal = localStorage.getItem('auth_token');
		initial = {
			token: rawCookie ?? rawLocal ?? null
		};
	}

	const { subscribe, set, update } = writable<AuthState>(initial);

	if (browser) {
		subscribe((value) => {
			if (value.token) {
				localStorage.setItem('auth_token', value.token);
				document.cookie = `auth_token=${encodeURIComponent(value.token)}; Path=/; SameSite=Lax`;
			} else {
				localStorage.removeItem('auth_token');
				document.cookie = 'auth_token=; Max-Age=0; Path=/; SameSite=Lax';
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
			if (browser) {
				localStorage.removeItem('auth_token');
				document.cookie = 'auth_token=; Max-Age=0; Path=/; SameSite=Lax';
			}
		},
		hasToken(): boolean {
			if (!browser) return false;
			const raw = getCookieToken() ?? localStorage.getItem('auth_token');
			return !!raw;
		},
		getToken(): string | null {
			if (!browser) return null;
			return getCookieToken() ?? localStorage.getItem('auth_token');
		}
	};
}

export const auth = createAuthStore();
