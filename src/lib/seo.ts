export function clampText(s: string, max = 180) {
	const v = (s ?? '').replace(/\s+/g, ' ').trim();
	if (v.length <= max) return v;
	return v.slice(0, max - 1).trimEnd() + '…';
}
