<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'password';
	type EntityKey = 'anime' | 'genre' | 'anime_title' | 'watcher' | 'account' | 'anime_video';

	interface Option {
		value: string;
		label: string;
	}

	interface FieldConfig {
		name: string;
		label: string;
		type: FieldType;
		readOnly?: boolean;
		options?: Option[];
		nullable?: boolean;
	}

	interface ColumnConfig {
		key: string;
		label: string;
	}

	interface SearchFieldConfig {
		value: string;
		label: string;
	}

	interface FilterConfig {
		field: string;
		type: 'select';
		label: string;
		options: Option[];
	}

	interface EntityEndpoints {
		list: string;
		create: string;
		update: string;
		delete: string;
	}

	interface EntityConfig {
		key: EntityKey;
		label: string;
		endpoints: EntityEndpoints;
		primaryField: string;
		columns: ColumnConfig[];
		fields: FieldConfig[];
		searchFields: SearchFieldConfig[];
		filters?: FilterConfig[];
	}

	type Item = Record<string, any>;

	type GenreItem = { gid: string; name: string };
	type TitleDraft = { gid?: string | null; language: string; name: string };

	const statusOptions: Option[] = [
		{ value: 'ongoing', label: 'Онгоинг' },
		{ value: 'released', label: 'Вышел' }
	];

	const ageOptions: Option[] = [
		{ value: 'g', label: 'G' },
		{ value: 'pg', label: 'PG' },
		{ value: 'pg-13', label: 'PG-13' },
		{ value: 'r-17', label: 'R-17' },
		{ value: 'r+', label: 'R+' }
	];

	const typeOptions: Option[] = [
		{ value: 'tv', label: 'TV' },
		{ value: 'movie', label: 'Фильм' },
		{ value: 'ova', label: 'OVA' },
		{ value: 'ona', label: 'ONA' },
		{ value: 'special', label: 'Спецвыпуск' },
		{ value: 'tv_special', label: 'TV спец' },
		{ value: 'music', label: 'Музыка' },
		{ value: 'pv', label: 'PV' },
		{ value: 'cm', label: 'CM' }
	];

	const languageOptions: Option[] = [
		{ value: 'ru', label: 'Русский' },
		{ value: 'en', label: 'Английский' },
		{ value: 'ja', label: 'Японский' },
		{ value: 'ko', label: 'Корейский' },
		{ value: 'zh', label: 'Китайский' }
	];

	const entityConfigs: Record<EntityKey, EntityConfig> = {
		anime: {
			key: 'anime',
			label: 'Аниме',
			endpoints: {
				list: '/v2/anime/list',
				create: '/v2/anime/',
				update: '/v2/anime/{gid}',
				delete: '/v2/anime/{gid}'
			},
			primaryField: 'title',
			columns: [
				{ key: 'status', label: 'Статус' },
				{ key: 'type', label: 'Тип' },
				{ key: 'age', label: 'Возраст' },
				{ key: 'number_episodes', label: 'Эпизоды' },
				{ key: 'url', label: 'Ссылка' },
				{ key: 'start_date', label: 'Начинается' },
				{ key: 'end_date', label: 'Заканчивается' },
				{ key: 'enable', label: 'Вкл' }
			],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'title', label: 'Название', type: 'text' },
				{ name: 'status', label: 'Статус', type: 'select', options: statusOptions },
				{ name: 'type', label: 'Тип', type: 'select', options: typeOptions },
				{ name: 'age', label: 'Возрастной рейтинг', type: 'select', options: ageOptions },
				{ name: 'url', label: 'URL', type: 'text' },
				{ name: 'preview_path', label: 'Постер (preview_path)', type: 'text' },
				{ name: 'number_episodes', label: 'Кол-во эпизодов', type: 'number' },
				{ name: 'start_date', label: 'Дата начала', type: 'number' },
				{ name: 'end_date', label: 'Дата конца', type: 'number' },
				{ name: 'description', label: 'Описание', type: 'textarea' },
				{ name: 'enable', label: 'Включено', type: 'checkbox' },
				{ name: 'created_at', label: 'Создано', type: 'text', readOnly: true },
				{ name: 'updated_at', label: 'Обновлено', type: 'text', readOnly: true }
			],
			searchFields: [
				{ value: 'title', label: 'Название' },
				{ value: 'gid', label: 'GID' },
				{ value: 'url', label: 'URL' }
			],
			filters: [
				{ field: 'status', type: 'select', label: 'Статус', options: statusOptions },
				{ field: 'type', type: 'select', label: 'Тип', options: typeOptions },
				{ field: 'age', type: 'select', label: 'Возраст', options: ageOptions }
			]
		},
		genre: {
			key: 'genre',
			label: 'Жанры',
			endpoints: {
				list: '/v2/anime/genre/list',
				create: '/v2/anime/genre',
				update: '/v2/anime/genre/{gid}',
				delete: '/v2/anime/genre/{gid}'
			},
			primaryField: 'name',
			columns: [{ key: 'gid', label: 'GID' }],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'name', label: 'Название', type: 'text' }
			],
			searchFields: [
				{ value: 'name', label: 'Название' },
				{ value: 'gid', label: 'GID' }
			]
		},
		anime_title: {
			key: 'anime_title',
			label: 'Названия',
			endpoints: {
				list: '/v2/anime/title/list',
				create: '/v2/anime/title',
				update: '/v2/anime/title/{gid}',
				delete: '/v2/anime/title/{gid}'
			},
			primaryField: 'name',
			columns: [
				{ key: 'anime_gid', label: 'Аниме GID' },
				{ key: 'language', label: 'Язык' }
			],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'anime_gid', label: 'Аниме GID', type: 'text' },
				{ name: 'language', label: 'Язык', type: 'select', options: languageOptions },
				{ name: 'name', label: 'Название', type: 'text' },
				{ name: 'created_at', label: 'Создано', type: 'text', readOnly: true },
				{ name: 'updated_at', label: 'Обновлено', type: 'text', readOnly: true }
			],
			searchFields: [
				{ value: 'name', label: 'Название' },
				{ value: 'anime_gid', label: 'Аниме GID' },
				{ value: 'gid', label: 'GID' }
			],
			filters: [{ field: 'language', type: 'select', label: 'Язык', options: languageOptions }]
		},
		watcher: {
			key: 'watcher',
			label: 'История просмотров',
			endpoints: {
				list: '/v2/watcher/list',
				create: '/v2/watcher/',
				update: '/v2/watcher/{gid}',
				delete: '/v2/watcher/{gid}'
			},
			primaryField: 'anime_gid',
			columns: [
				{ key: 'account_gid', label: 'Аккаунт' },
				{ key: 'series', label: 'Серия' },
				{ key: 'timecode', label: 'Таймкод' },
				{ key: 'viewed', label: 'Просмотрено' }
			],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'anime_gid', label: 'Аниме GID', type: 'text' },
				{ name: 'account_gid', label: 'Аккаунт GID', type: 'text' },
				{ name: 'series', label: 'Серия', type: 'number' },
				{ name: 'timecode', label: 'Таймкод (сек.)', type: 'number' },
				{ name: 'acting_team', label: 'Студия озвучки', type: 'text' },
				{ name: 'viewed', label: 'Просмотрено', type: 'checkbox' },
				{ name: 'created_at', label: 'Создано', type: 'text', readOnly: true },
				{ name: 'updated_at', label: 'Обновлено', type: 'text', readOnly: true }
			],
			searchFields: [
				{ value: 'anime_gid', label: 'Аниме GID' },
				{ value: 'account_gid', label: 'Аккаунт GID' },
				{ value: 'gid', label: 'GID' }
			]
		},
		account: {
			key: 'account',
			label: 'Аккаунты',
			endpoints: {
				list: '/v2/account/list',
				create: '/v2/account',
				update: '/v2/account/{gid}',
				delete: '/v2/account/{gid}'
			},
			primaryField: 'username',
			columns: [
				{ key: 'email', label: 'Email' },
				{ key: 'is_admin', label: 'Админ' },
				{ key: 'disabled', label: 'Отключён' }
			],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'username', label: 'Логин', type: 'text' },
				{ name: 'email', label: 'Email', type: 'text' },
				{ name: 'password', label: 'Пароль', type: 'password' },
				{ name: 'disabled', label: 'Отключён', type: 'checkbox' },
				{ name: 'is_email_verified', label: 'Email подтверждён', type: 'checkbox' },
				{ name: 'is_admin', label: 'Админ', type: 'checkbox' },
				{ name: 'created_at', label: 'Создано', type: 'text', readOnly: true },
				{ name: 'updated_at', label: 'Обновлено', type: 'text', readOnly: true }
			],
			searchFields: [
				{ value: 'username', label: 'Логин' },
				{ value: 'email', label: 'Email' },
				{ value: 'gid', label: 'GID' }
			],
			filters: [
				{
					field: 'disabled',
					type: 'select',
					label: 'Статус',
					options: [
						{ value: 'true', label: 'Отключён' },
						{ value: 'false', label: 'Активен' }
					]
				},
				{
					field: 'is_admin',
					type: 'select',
					label: 'Роль',
					options: [
						{ value: 'true', label: 'Админ' },
						{ value: 'false', label: 'Пользователь' }
					]
				}
			]
		},
		anime_video: {
			key: 'anime_video',
			label: 'Видео',
			endpoints: {
				list: '/v2/video/list',
				create: '/v2/video/',
				update: '/v2/video/{gid}',
				delete: '/v2/video/{gid}'
			},
			primaryField: 'anime_gid',
			columns: [
				{ key: 'series', label: 'Серия' },
				{ key: 'path', label: 'Путь' }
			],
			fields: [
				{ name: 'gid', label: 'GID', type: 'text', readOnly: true },
				{ name: 'anime_gid', label: 'Аниме GID', type: 'text' },
				{ name: 'series', label: 'Серия', type: 'number' },
				{ name: 'path', label: 'Путь к файлу', type: 'text' },
				{ name: 'opening_start', label: 'Начало заставки (сек.)', type: 'number', nullable: true },
				{ name: 'opening_end', label: 'Конец заставки (сек.)', type: 'number', nullable: true },
				{ name: 'end', label: 'Конец (сек.)', type: 'number', nullable: true },
				{ name: 'created_at', label: 'Создано', type: 'text', readOnly: true },
				{ name: 'updated_at', label: 'Обновлено', type: 'text', readOnly: true }
			],
			searchFields: [
				{ value: 'anime_gid', label: 'Аниме GID' },
				{ value: 'series', label: 'Серия' },
				{ value: 'gid', label: 'GID' }
			]
		}
	};

	const pageSizeOptions = [50, 100, 300] as const;

	let activeEntity = $state<EntityKey>('anime');
	let items = $state<Item[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pageSize = $state<number>(pageSizeOptions[0]);

	let totalPages = $derived.by(() => Math.max(1, Math.ceil(total / pageSize)));

	let searchInput = $state('');
	let search = $state('');
	let searchField = $state('');
	let filterValues = $state<Record<string, string>>({});

	let listLoading = $state(false);
	let saving = $state(false);
	let editingItem = $state<Item | null>(null);
	let isNew = $state(false);

	let passwordLocked = $state(true);

	let genreDrawerOpen = $state(false);
	let genreListLoading = $state(false);
	let allGenres = $state<GenreItem[]>([]);
	let genreSearch = $state('');

	let titlesDrawerOpen = $state(false);

	async function authorizedFetch(url: string, init: RequestInit = {}) {
		const token = auth.getToken();
		const headers = new Headers(init.headers ?? {});
		if (token) headers.set('Authorization', `Bearer ${token}`);
		const res = await fetch(url, { ...init, headers });
		if ((res.status === 401 || res.status === 403) && browser) {
			goto('/');
		}
		return res;
	}

	function getConfig(): EntityConfig {
		return entityConfigs[activeEntity];
	}

	function isUuid(v: unknown): v is string {
		if (typeof v !== 'string') return false;
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
	}

	function normalizeAnimeEditorShape(obj: Item) {
		const rawGenres = Array.isArray(obj.genres) ? obj.genres : [];
		const normalizedGenres: string[] = rawGenres
			.map((g: any) => (typeof g === 'string' ? g : g?.gid))
			.filter((x: any) => isUuid(x));

		const rawTitles = Array.isArray(obj.titles) ? obj.titles : [];
		const normalizedTitles: TitleDraft[] = rawTitles
			.map((t: any) => ({
				gid: isUuid(t?.gid) ? t.gid : null,
				language: String(t?.language ?? 'ru'),
				name: String(t?.name ?? '')
			}))
			.filter((t: TitleDraft) => t.name.trim().length > 0 || t.gid);

		obj.genres = normalizedGenres;
		obj.titles = normalizedTitles;
	}

	function createEmptyFor(entity: EntityKey): Item {
		const config = entityConfigs[entity];
		const obj: Item = {};

		for (const field of config.fields) {
			if (field.readOnly) continue;
			if (field.type === 'checkbox') obj[field.name] = false;
			else if (field.nullable) obj[field.name] = null;
			else if (field.type === 'number') obj[field.name] = '';
			else obj[field.name] = '';
		}

		if (entity === 'anime') {
			const year = new Date().getFullYear();
			obj.status = statusOptions[0]?.value ?? 'ongoing';
			obj.type = typeOptions[0]?.value ?? 'tv';
			obj.age = ageOptions[2]?.value ?? 'pg-13';
			obj.start_date = year;
			obj.end_date = year;
			obj.genres = [];
			obj.titles = [{ language: 'ru', name: '' }];
		}

		return obj;
	}

	function cloneItem<T extends Item>(value: T): T {
		if (!value) return value;

		try {
			return JSON.parse(JSON.stringify(value));
		} catch {
			const copy = {} as T;
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) copy[key] = value[key];
			}
			return copy;
		}
	}

	function buildEndpoint(path: string, params: Record<string, string>): string {
		let result = path;
		for (const [key, value] of Object.entries(params)) {
			result = result.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(value));
		}
		return result;
	}

	function selectEntity(entityKey: EntityKey) {
		if (activeEntity === entityKey) return;
		activeEntity = entityKey;
		page = 1;
		search = '';
		searchInput = '';
		items = [];
		total = 0;
		editingItem = null;
		isNew = false;
		passwordLocked = true;

		genreDrawerOpen = false;
		titlesDrawerOpen = false;

		const cfg = entityConfigs[entityKey];
		searchField = cfg.searchFields[0]?.value ?? '';

		const defaults: Record<string, string> = {};
		for (const f of cfg.filters ?? []) defaults[f.field] = '';
		filterValues = defaults;
	}

	async function loadList() {
		listLoading = true;
		const config = getConfig();

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('page_size', String(pageSize));

			if (search.trim()) {
				params.set('text', search.trim());
				if (searchField) params.set('search_field', searchField);
			}

			for (const [key, value] of Object.entries(filterValues)) {
				if (value !== '') params.set(key, value);
			}

			const res = await authorizedFetch(
				PUBLIC_API_URL + config.endpoints.list + '?' + params.toString()
			);
			const json = await res.json();
			const data = (json.result ?? json.items ?? json) as Item[];

			items = Array.isArray(data) ? data : [];
			total = typeof json.total === 'number' ? json.total : items.length;
		} catch (e) {
			console.error(e);
		} finally {
			listLoading = false;
		}
	}

	async function loadAllGenresOnce() {
		if (genreListLoading) return;
		if (allGenres.length > 0) return;

		genreListLoading = true;
		try {
			const pageSize = 300;
			let page = 1;
			const merged: GenreItem[] = [];
			const seen = new Set<string>();

			for (let i = 0; i < 200; i++) {
				const params = new URLSearchParams();
				params.set('page', String(page));
				params.set('page_size', String(pageSize));

				const res = await authorizedFetch(
					PUBLIC_API_URL + entityConfigs.genre.endpoints.list + '?' + params.toString()
				);
				const json = await res.json();
				const data = (json.result ?? json.items ?? json) as any[];

				const chunk: GenreItem[] = Array.isArray(data)
					? data
							.map((g) => ({ gid: String(g?.gid ?? ''), name: String(g?.name ?? '') }))
							.filter((g) => isUuid(g.gid) && g.name)
					: [];

				for (const g of chunk) {
					if (!seen.has(g.gid)) {
						seen.add(g.gid);
						merged.push(g);
					}
				}

				if (chunk.length < pageSize) break;

				page += 1;
			}

			allGenres = merged;
		} catch (e) {
			console.error(e);
		} finally {
			genreListLoading = false;
		}
	}

	function openNew() {
		editingItem = createEmptyFor(activeEntity);
		isNew = true;

		if (activeEntity === 'account') {
			passwordLocked = false;
			(editingItem as Item).password = '';
		}

		if (activeEntity === 'anime') {
			normalizeAnimeEditorShape(editingItem as Item);
			loadAllGenresOnce();
		}
	}

	function openExisting(item: Item) {
		editingItem = cloneItem(item);
		isNew = false;

		if (activeEntity === 'account') {
			passwordLocked = true;
			(editingItem as Item).password = null;
		}

		if (activeEntity === 'anime') {
			normalizeAnimeEditorShape(editingItem as Item);
			loadAllGenresOnce();
		}
	}

	function updateField(field: FieldConfig, value: unknown) {
		if (!editingItem) return;

		if (field.type === 'number') {
			const str = typeof value === 'string' ? value : String(value ?? '');
			if (str === '') {
				editingItem[field.name] = field.nullable ? null : '';
				return;
			}
			const num = Number(str);
			editingItem[field.name] = Number.isNaN(num) ? (field.nullable ? null : '') : num;
			return;
		}

		if (field.nullable && (value === '' || value == null)) editingItem[field.name] = null;
		else editingItem[field.name] = value;
	}

	function formatValue(value: unknown): string {
		if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
		if (value == null) return '';
		if (typeof value === 'string' && value.length > 80) return value.slice(0, 77) + '...';
		return String(value);
	}

	function updateFilter(field: string, value: string) {
		filterValues = { ...filterValues, [field]: value };
		page = 1;
	}

	function changeSearchField(value: string) {
		searchField = value;
		page = 1;
	}

	function changePageSize(value: string) {
		const num = Number(value);
		if (!Number.isNaN(num) && num > 0) {
			pageSize = num;
			page = 1;
		}
	}

	function handleSearch(query: string) {
		search = query;
		searchInput = query;
		page = 1;
	}

	function goPrev() {
		if (page <= 1) return;
		page -= 1;
	}

	function goNext() {
		if (page >= totalPages) return;
		page += 1;
	}

	function goFirst() {
		if (page === 1) return;
		page = 1;
	}

	function goLast() {
		if (page >= totalPages) return;
		page = totalPages;
	}

	function getSelectedGenreIds(): string[] {
		if (!editingItem) return [];
		const v = editingItem.genres;
		return Array.isArray(v) ? v.filter((x: any) => isUuid(x)) : [];
	}

	function toggleGenre(gid: string) {
		if (!editingItem) return;
		const current = getSelectedGenreIds();
		if (current.includes(gid)) editingItem.genres = current.filter((x) => x !== gid);
		else editingItem.genres = [...current, gid];
	}

	function getGenreName(gid: string) {
		return allGenres.find((g) => g.gid === gid)?.name ?? gid;
	}

	function openGenresDrawer() {
		genreDrawerOpen = true;
		genreSearch = '';
		loadAllGenresOnce();
	}

	function closeGenresDrawer() {
		genreDrawerOpen = false;
	}

	function getTitleDrafts(): TitleDraft[] {
		if (!editingItem) return [];
		const v = editingItem.titles;
		return Array.isArray(v) ? v : [];
	}

	function setTitleDrafts(next: TitleDraft[]) {
		if (!editingItem) return;
		editingItem.titles = next;
	}

	function addTitleRow() {
		const drafts = getTitleDrafts();
		setTitleDrafts([...drafts, { gid: null, language: 'ru', name: '' }]);
	}

	function removeTitleRow(index: number) {
		const drafts = getTitleDrafts();
		setTitleDrafts(drafts.filter((_, i) => i !== index));
	}

	function updateTitleField(index: number, key: keyof TitleDraft, value: string) {
		const drafts = getTitleDrafts();
		const next = drafts.map((t, i) => (i === index ? { ...t, [key]: value } : t));
		setTitleDrafts(next);
	}

	function openTitlesDrawer() {
		titlesDrawerOpen = true;
		if (editingItem && !Array.isArray(editingItem.titles)) editingItem.titles = [];
	}

	function closeTitlesDrawer() {
		titlesDrawerOpen = false;
	}

	function buildAnimePayloadForRequest(source: Item, isCreate: boolean) {
		const payload = cloneItem(source);

		const genreIds = Array.isArray(payload.genres) ? payload.genres : [];
		payload.genres = genreIds.filter((x: any) => isUuid(x));

		const drafts: TitleDraft[] = Array.isArray(payload.titles) ? payload.titles : [];
		const cleaned = drafts
			.map((t) => ({
				gid: t.gid && isUuid(t.gid) ? t.gid : null,
				language: String(t.language ?? 'ru'),
				name: String(t.name ?? '').trim()
			}))
			.filter((t) => t.name.length > 0);

		const dedupKey = new Set<string>();
		const deduped = cleaned.filter((t) => {
			const k = `${t.language}::${t.name}`.toLowerCase();
			if (dedupKey.has(k)) return false;
			dedupKey.add(k);
			return true;
		});

		if (isCreate) payload.titles = deduped.map((t) => ({ language: t.language, name: t.name }));
		else
			payload.titles = deduped.map((t) => ({
				gid: t.gid ?? null,
				language: t.language,
				name: t.name
			}));

		return payload;
	}

	async function saveCurrent() {
		if (!editingItem) return;
		saving = true;

		const config = getConfig();

		try {
			const gid = editingItem.gid as string | undefined;
			const hasId = Boolean(gid);

			let path = config.endpoints.create;
			let method: 'POST' | 'PUT' = 'POST';

			if (hasId && !isNew) {
				path = buildEndpoint(config.endpoints.update, { gid: gid as string });
				method = 'PUT';
			}

			let payload = cloneItem(editingItem);

			if (config.key === 'account') {
				if (!isNew && passwordLocked) payload.password = null;
			}

			if (config.key === 'anime') {
				const isCreate = method === 'POST';
				payload = buildAnimePayloadForRequest(payload, isCreate);
			}

			const res = await authorizedFetch(PUBLIC_API_URL + path, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const json = await res.json();
			editingItem = (json.result ?? json) as Item;
			isNew = false;

			if (activeEntity === 'anime' && editingItem) normalizeAnimeEditorShape(editingItem);

			genreDrawerOpen = false;
			titlesDrawerOpen = false;

			await loadList();
		} catch (e) {
			console.error(e);
		} finally {
			saving = false;
		}
	}

	async function deleteCurrent() {
		if (!editingItem) return;
		const gid = editingItem.gid as string | undefined;
		if (!gid) return;
		if (!confirm('Удалить объект?')) return;

		saving = true;
		const config = getConfig();

		try {
			const path = buildEndpoint(config.endpoints.delete, { gid });
			await authorizedFetch(PUBLIC_API_URL + path, { method: 'DELETE' });
			editingItem = null;
			isNew = false;
			await loadList();
		} catch (e) {
			console.error(e);
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		const cfg = getConfig();
		if (!searchField && cfg.searchFields.length) searchField = cfg.searchFields[0].value;
	});

	$effect(() => {
		activeEntity;
		page;
		search;
		filterValues;
		searchField;
		pageSize;
		loadList();
	});
</script>

<Seo
	title="Админ-панель – AnimeViewer"
	description="Внутренняя панель управления."
	noindex={true}
/>

<div class="mx-auto max-w-screen-2xl space-y-6 px-4 pt-8 pb-10">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Админ-панель</h1>
			<p class="mt-1 text-sm text-white/60">
				Управление аниме, жанрами, пользователями, историей и видео.
			</p>
		</div>

		<div class="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
			{#each Object.values(entityConfigs) as cfg}
				<button
					class={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
						activeEntity === cfg.key
							? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-md shadow-fuchsia-500/30'
							: 'text-white/70 hover:bg-white/10 hover:text-white'
					}`}
					onclick={() => selectEntity(cfg.key)}
				>
					{cfg.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
		<section
			class="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.03] to-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_45px_rgба(0,0,0,0.6)] sm:p-5"
		>
			<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="min-w-0 flex-1 space-y-2">
					<div class="flex items-stretch gap-2">
						<div class="min-w-0 flex-1">
							<SearchBar bind:q={searchInput} onSearch={handleSearch} />
						</div>

						{#if getConfig().searchFields.length > 0}
							<select
								class="w-40 rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-xs text-white/90 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
								value={searchField}
								onchange={(e) => changeSearchField((e.target as HTMLSelectElement).value)}
							>
								{#each getConfig().searchFields as sf}
									<option value={sf.value}>{sf.label}</option>
								{/each}
							</select>
						{/if}
					</div>

					{#if (getConfig().filters ?? []).length > 0}
						<div class="flex flex-wrap gap-2 text-[11px]">
							{#each getConfig().filters ?? [] as filter}
								<label class="flex items-center gap-1 text-white/70">
									<span>{filter.label}:</span>
									<select
										class="rounded-full border border-white/10 bg-[#14101e] px-2 py-1 pr-7 text-xs text-white/90 focus:ring-1 focus:ring-fuchsia-500/60 focus:outline-none"
										value={filterValues[filter.field] ?? ''}
										onchange={(e) =>
											updateFilter(filter.field, (e.target as HTMLSelectElement).value)}
									>
										<option value="">Все</option>
										{#each filter.options as opt}
											<option value={opt.value}>{opt.label}</option>
										{/each}
									</select>
								</label>
							{/each}
						</div>
					{/if}
				</div>

				<button class="btn-custom whitespace-nowrap" onclick={openNew}>Добавить</button>
			</div>

			{#if listLoading}
				<div class="py-10 text-center text-sm text-white/60">Загрузка...</div>
			{:else if items.length === 0}
				<div class="py-10 text-center text-sm text-white/60">Ничего не найдено</div>
			{:else}
				<div class="overflow-auto rounded-2xl border border-white/10 bg-black/20">
					<table class="min-w-full text-sm">
						<thead class="bg-white/5 text-[11px] tracking-wide text-white/60 uppercase">
							<tr>
								<th class="sticky left-0 z-10 bg-[#14101e] px-3 py-2 text-left"
									>{getConfig().label}</th
								>
								{#each getConfig().columns as col}
									<th class="px-3 py-2 text-left whitespace-nowrap">{col.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each items as item}
								<tr
									class="cursor-pointer border-t border-white/5 hover:bg-white/5"
									onclick={() => openExisting(item)}
								>
									<td class="sticky left-0 bg-[#14101e] px-3 py-2 text-[13px] font-medium">
										{item[getConfig().primaryField] ?? '—'}
									</td>
									{#each getConfig().columns as col}
										<td class="px-3 py-2 align-top text-[13px] text-white/80"
											>{formatValue(item[col.key])}</td
										>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div
					class="mt-4 flex flex-col gap-3 text-[12px] text-white/65 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-3">
						<div>
							Всего: <span class="font-semibold text-white/80">{total}</span>
						</div>
						<div class="flex items-center gap-2">
							<span>На странице:</span>
							<select
								class="rounded-full border border-white/10 bg-[#14101e] px-2 py-1 text-xs text-white/90 focus:ring-1 focus:ring-fuchsia-500/60 focus:outline-none"
								value={String(pageSize)}
								onchange={(e) => changePageSize((e.target as HTMLSelectElement).value)}
							>
								{#each pageSizeOptions as size}
									<option value={size}>{size}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<button
							class="rounded-full bg-white/5 px-2.5 py-1 transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
							onclick={goFirst}
							disabled={page <= 1}
						>
							«
						</button>
						<button
							class="rounded-full bg-white/5 px-2.5 py-1 transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
							onclick={goPrev}
							disabled={page <= 1}
						>
							←
						</button>
						<span>Стр. {page} из {totalPages}</span>
						<button
							class="rounded-full bg-white/5 px-2.5 py-1 transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
							onclick={goNext}
							disabled={page >= totalPages}
						>
							→
						</button>
						<button
							class="rounded-full bg-white/5 px-2.5 py-1 transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
							onclick={goLast}
							disabled={page >= totalPages}
						>
							»
						</button>
					</div>
				</div>
			{/if}
		</section>

		<section
			class="min-h-[260px] rounded-3xl border border-white/10 bg-[#0e0b17]/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-7"
		>
			{#if editingItem}
				<div class="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 class="text-lg font-semibold">{isNew ? 'Новый объект' : 'Редактирование'}</h2>
						<p class="mt-1 text-xs text-white/60">{getConfig().label}</p>
					</div>
					<span
						class="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-wide text-white/60 uppercase"
					>
						{activeEntity}
					</span>
				</div>

				<form
					class="max-h-[520px] space-y-3 overflow-auto px-3 pb-4"
					onsubmit={(e) => {
						e.preventDefault();
						saveCurrent();
					}}
				>
					{#each getConfig().fields as field}
						{#if !(isNew && field.readOnly)}
							<div class="space-y-1">
								{#if field.type === 'checkbox'}
									<label class="inline-flex items-center gap-2 text-sm text-white/80">
										<input
											type="checkbox"
											class="rounded border-white/30 bg-[#14101e] text-fuchsia-500 focus:ring-fuchsia-500/60"
											checked={Boolean(editingItem[field.name])}
											onchange={(e) => updateField(field, (e.target as HTMLInputElement).checked)}
											disabled={field.readOnly}
										/>
										<span>{field.label}</span>
									</label>
								{:else}
									<label
										class="block text-[11px] font-semibold tracking-wide text-white/55 uppercase"
										for={`${getConfig().key}-${field.name}`}
									>
										{field.label}
									</label>

									{#if field.type === 'textarea'}
										<textarea
											id={`${getConfig().key}-${field.name}`}
											class="min-h-[80px] w-full resize-y rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
											value={editingItem[field.name] ?? ''}
											oninput={(e) => updateField(field, (e.target as HTMLTextAreaElement).value)}
											readonly={field.readOnly}
										></textarea>
									{:else if field.type === 'select'}
										<select
											id={`${getConfig().key}-${field.name}`}
											class="w-full rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
											value={editingItem[field.name] ?? ''}
											onchange={(e) => updateField(field, (e.target as HTMLSelectElement).value)}
											disabled={field.readOnly}
										>
											<option value="">—</option>
											{#each field.options ?? [] as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									{:else if field.type === 'password' && activeEntity === 'account'}
										<div class="flex items-center gap-2">
											<input
												id={`${getConfig().key}-${field.name}`}
												class="w-full rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
												type="password"
												value={passwordLocked ? '********' : (editingItem[field.name] ?? '')}
												oninput={(e) => {
													if (!passwordLocked)
														updateField(field, (e.target as HTMLInputElement).value);
												}}
												readonly={field.readOnly || passwordLocked}
											/>

											{#if !isNew}
												<button
													type="button"
													class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs whitespace-nowrap hover:bg-white/10"
													onclick={() => {
														if (passwordLocked) {
															passwordLocked = false;
															updateField(field, '');
														} else {
															passwordLocked = true;
															updateField(field, null);
														}
													}}
												>
													{passwordLocked ? 'Разблокировать' : 'Не менять пароль'}
												</button>
											{/if}
										</div>
									{:else}
										<input
											id={`${getConfig().key}-${field.name}`}
											class="w-full rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
											type={field.type === 'number' ? 'number' : 'text'}
											value={editingItem[field.name] ?? ''}
											oninput={(e) => updateField(field, (e.target as HTMLInputElement).value)}
											readonly={field.readOnly}
										/>
									{/if}
								{/if}
							</div>
						{/if}
					{/each}

					{#if activeEntity === 'anime'}
						<div class="space-y-2 pt-2">
							<div class="flex flex-col gap-2">
								<button
									type="button"
									class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm hover:bg-white/10"
									onclick={openGenresDrawer}
								>
									Жанры:
									<span class="font-semibold text-white/80">
										{getSelectedGenreIds().length}
									</span>
								</button>

								<button
									type="button"
									class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm hover:bg-white/10"
									onclick={openTitlesDrawer}
								>
									Названия:
									<span class="font-semibold text-white/80">
										{getTitleDrafts().filter((t) => String(t.name ?? '').trim().length > 0).length}
									</span>
								</button>

								{#if getSelectedGenreIds().length > 0}
									<div class="text-[12px] text-white/60">
										{#each getSelectedGenreIds().slice(0, 6) as gid, i}
											<span
												class="mr-1 mb-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1"
											>
												{getGenreName(gid)}
											</span>
										{/each}
										{#if getSelectedGenreIds().length > 6}
											<span class="text-white/50">и ещё {getSelectedGenreIds().length - 6}</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<div class="flex flex-wrap items-center gap-3 pt-2">
						<button
							type="submit"
							class="btn-custom disabled:cursor-not-allowed disabled:opacity-50"
							disabled={saving}
						>
							{saving ? 'Сохранение...' : 'Сохранить'}
						</button>
						<button
							type="button"
							class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
							onclick={() => {
								editingItem = null;
								isNew = false;
								genreDrawerOpen = false;
								titlesDrawerOpen = false;
							}}
							disabled={saving}
						>
							Отмена
						</button>
						{#if !isNew}
							<button
								type="button"
								class="ml-auto rounded-xl bg-red-500/80 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
								onclick={deleteCurrent}
								disabled={saving}
							>
								Удалить
							</button>
						{/if}
					</div>
				</form>
			{:else}
				<div
					class="flex h-full flex-col items-center justify-center px-4 text-center text-white/60"
				>
					<p class="mb-3 text-sm">Выберите объект из списка слева или создайте новый.</p>
					<button class="btn-custom text-sm" onclick={openNew}
						>Добавить {getConfig().label.toLowerCase()}</button
					>
				</div>
			{/if}
		</section>
	</div>
</div>

{#if activeEntity === 'anime' && editingItem}
	<div class={`fixed inset-0 z-[70] ${genreDrawerOpen ? '' : 'pointer-events-none'}`}>
		<button
			type="button"
			aria-label="Закрыть список жанров"
			class={`absolute inset-0 bg-black/60 transition-opacity ${genreDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
			onclick={closeGenresDrawer}
		></button>

		<div
			class={`absolute top-0 right-0 h-full w-[420px] max-w-[92vw] border-l border-white/10 bg-[#0e0b17] shadow-2xl transition-transform ${
				genreDrawerOpen ? 'translate-x-0' : 'translate-x-full'
			}`}
		>
			<div class="flex items-center gap-2 border-b border-white/10 p-4">
				<div class="flex-1">
					<div class="text-sm font-semibold">Жанры</div>
					<div class="text-[12px] text-white/60">
						Выбрано: {getSelectedGenreIds().length}
					</div>
				</div>
				<button
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
					onclick={closeGenresDrawer}
				>
					Закрыть
				</button>
			</div>

			<div class="space-y-3 p-4">
				<input
					class="w-full rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
					placeholder="Поиск жанра..."
					value={genreSearch}
					oninput={(e) => (genreSearch = (e.target as HTMLInputElement).value)}
				/>

				{#if genreListLoading}
					<div class="text-sm text-white/60">Загрузка жанров...</div>
				{:else}
					<div class="max-h-[70vh] space-y-1 overflow-auto pr-1">
						{#each allGenres.filter((g) => g.name
								.toLowerCase()
								.includes(genreSearch.trim().toLowerCase())) as g (g.gid)}
							<label
								class="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5"
							>
								<input
									type="checkbox"
									class="rounded border-white/30 bg-[#14101e] text-fuchsia-500 focus:ring-fuchsia-500/60"
									checked={getSelectedGenreIds().includes(g.gid)}
									onchange={() => toggleGenre(g.gid)}
								/>
								<span class="text-sm text-white/85">{g.name}</span>
								<span class="ml-auto text-[10px] text-white/35">{g.gid.slice(0, 8)}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class={`fixed inset-0 z-[70] ${titlesDrawerOpen ? '' : 'pointer-events-none'}`}>
		<button
			type="button"
			aria-label="Закрыть список названий"
			class={`absolute inset-0 bg-black/60 transition-opacity ${titlesDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
			onclick={closeTitlesDrawer}
		></button>

		<div
			class={`absolute top-0 right-0 h-full w-[520px] max-w-[95vw] border-l border-white/10 bg-[#0e0b17] shadow-2xl transition-transform ${
				titlesDrawerOpen ? 'translate-x-0' : 'translate-x-full'
			}`}
		>
			<div class="flex items-center gap-2 border-b border-white/10 p-4">
				<div class="flex-1">
					<div class="text-sm font-semibold">Названия (AnimeTitle)</div>
					<div class="text-[12px] text-white/60">
						Здесь можно добавить новое или изменить существующее
					</div>
				</div>
				<button
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
					onclick={closeTitlesDrawer}
				>
					Закрыть
				</button>
			</div>

			<div class="space-y-3 p-4">
				<button
					type="button"
					class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
					onclick={addTitleRow}
				>
					+ Добавить название
				</button>

				<div class="max-h-[72vh] space-y-2 overflow-auto pr-1">
					{#each getTitleDrafts() as t, idx (t.gid ?? `${t.language}-${idx}`)}
						<div class="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
							<div class="flex items-center gap-2">
								<select
									class="w-40 rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
									value={t.language}
									onchange={(e) =>
										updateTitleField(idx, 'language', (e.target as HTMLSelectElement).value)}
								>
									{#each languageOptions as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>

								<button
									type="button"
									class="ml-auto rounded-xl bg-red-500/80 px-3 py-2 text-xs font-semibold hover:bg-red-500"
									onclick={() => removeTitleRow(idx)}
								>
									Удалить
								</button>
							</div>

							<input
								class="w-full rounded-xl border border-white/10 bg-[#14101e] px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:ring-2 focus:ring-fuchsia-500/60 focus:outline-none"
								placeholder="Название..."
								value={t.name}
								oninput={(e) => updateTitleField(idx, 'name', (e.target as HTMLInputElement).value)}
							/>

							{#if t.gid}
								<div class="text-[11px] text-white/45">gid: {t.gid}</div>
							{:else}
								<div class="text-[11px] text-white/45">новая запись (gid будет создан на бэке)</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
