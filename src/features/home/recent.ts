import { useEffect, useState } from "react";

type RecentItem = { slug: string; name: string };
const key = "orbital-field-desk:recent-equipment";

function read(): RecentItem[] {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
		return Array.isArray(stored)
			? stored
					.filter(
						(item): item is RecentItem =>
							typeof item?.slug === "string" && typeof item?.name === "string",
					)
					.slice(0, 6)
			: [];
	} catch {
		return [];
	}
}

export function useRecentItems() {
	const [items, setItems] = useState<RecentItem[]>([]);
	useEffect(() => setItems(read()), []);
	return items;
}

export function useRecordRecent(slug: string, name: string) {
	useEffect(() => {
		try {
			localStorage.setItem(
				key,
				JSON.stringify(
					[
						{ slug, name },
						...read().filter((item) => item.slug !== slug),
					].slice(0, 6),
				),
			);
		} catch {
			// Equipment remains available when browser storage is disabled.
		}
	}, [slug, name]);
}
