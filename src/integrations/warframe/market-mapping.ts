export interface MarketItem {
	id: string;
	slug: string;
	name: string;
	gameRef?: string;
}

function normalize(value: string) {
	return value
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[’']/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function matchMarketItem(
	entries: readonly MarketItem[],
	candidates: readonly string[],
	gameRef?: string,
) {
	if (gameRef) {
		const matches = entries.filter((entry) => entry.gameRef === gameRef);
		if (matches.length === 1) return matches[0];
	}
	for (const name of candidates) {
		const matches = entries.filter(
			(entry) => normalize(entry.name) === normalize(name),
		);
		if (matches.length === 1) return matches[0];
	}
}

export function retryDelay(value: string | null, now = Date.now()) {
	if (!value) return 60_000;
	const seconds = Number(value);
	const milliseconds = Number.isFinite(seconds)
		? seconds * 1000
		: Date.parse(value) - now;
	return Number.isFinite(milliseconds) ? Math.max(1000, milliseconds) : 60_000;
}
