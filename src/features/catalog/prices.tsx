import { useQuery } from "@tanstack/react-query";
import { RetroButton, RetroPanel } from "#/components/retro/controls";
import { loadPrices } from "./item-data";

type Price = Awaited<ReturnType<typeof loadPrices>>[number]["result"];

function describePrice(result: Price | undefined) {
	if (!result) return "Unavailable";
	switch (result.status) {
		case "fresh":
		case "stale":
			return `${result.quote.platinum} Platinum · ${result.status === "stale" ? "Last known · " : ""}${result.quote.observedAt.slice(0, 16).replace("T", " ")} UTC`;
		case "missing":
			return "No PC sell listing observed";
		case "unmapped":
			return "No matching market item";
		case "non-tradable":
			return "Non-tradable";
		default:
			return "Market temporarily unavailable";
	}
}

export function MarketPrices({
	slug,
	parts,
	enabled = true,
}: {
	slug: string;
	parts?: readonly { id: string; name: string; missing: number }[];
	enabled?: boolean;
}) {
	const missing = parts?.filter((part) => part.missing > 0);
	const ids = missing?.map((part) => part.id);
	const query = useQuery({
		queryKey: ["market-prices", slug, ids],
		queryFn: () => loadPrices({ data: { slug, parts: ids } }),
		enabled:
			enabled &&
			(!parts || Boolean(ids?.length)) &&
			typeof window !== "undefined",
		staleTime: 60_000,
		retry: false,
		refetchOnWindowFocus: false,
	});
	const prices = query.data;
	const total = missing?.every((part) =>
		prices?.some((entry) => entry.id === part.id && entry.result.quote),
	)
		? missing.reduce(
				(sum, part) =>
					sum +
					part.missing *
						(prices?.find((entry) => entry.id === part.id)?.result.quote
							?.platinum ?? 0),
				0,
			)
		: undefined;
	if (!enabled) return null;

	return (
		<RetroPanel className="text-panel">
			<h2>{parts ? "Purchase remaining parts" : "PC set price"}</h2>
			{parts && !ids?.length ? (
				<p>No missing parts to purchase.</p>
			) : query.isPending ? (
				<output>Loading PC listings…</output>
			) : query.isError || !prices?.length ? (
				<p>Market temporarily unavailable.</p>
			) : (
				<ul className="price-list">
					{prices.map(({ id, name, result }) => (
						<li key={id}>
							<strong>{name}</strong> · {describePrice(result)}
						</li>
					))}
				</ul>
			)}
			{total !== undefined && Boolean(ids?.length) && (
				<p>
					Estimated remaining purchase cost <strong>{total} Platinum</strong>
					{prices?.some((entry) => entry.result.status === "stale")
						? " (includes last-known prices)"
						: ""}
					.
				</p>
			)}
			<p className="data-note">
				Observed PC sell listings. Stock and final trade prices can change.
			</p>
			{query.isFetched && (
				<RetroButton
					onClick={() => void query.refetch()}
					disabled={query.isFetching}
				>
					Refresh listings
				</RetroButton>
			)}
		</RetroPanel>
	);
}
