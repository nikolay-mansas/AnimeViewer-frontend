declare global {
	interface TurnstileAPI {
		render: (el: HTMLElement, options: Record<string, unknown>) => string;
		reset: (id?: string) => void;
		remove: (id: string) => void;
	}

	interface Window {
		turnstile?: TurnstileAPI;
	}
}

export {};
