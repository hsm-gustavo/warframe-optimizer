import { Link } from "@tanstack/react-router";
import { ArrowRight, FolderOpen, Grid2X2, List, Search } from "lucide-react";
import { useState } from "react";
import {
	RetroButton,
	RetroInput,
	RetroPanel,
	StatusBar,
} from "#/components/retro/controls";
import { ItemIcon } from "#/components/retro/item-icon";
import { Window } from "#/components/retro/window";
import { type CatalogItem, type Category, categories } from "./models";

export type CatalogCategory = Category | "All";

export function ItemCatalog({
	items,
	source,
	page,
	onPageChange,
	query,
	category,
	onQueryChange,
	onCategoryChange,
}: {
	items: readonly Omit<CatalogItem, "components">[];
	source: "wfcd" | "sample";
	page: number;
	onPageChange: (page: number) => void;
	query: string;
	category: CatalogCategory;
	onQueryChange: (query: string) => void;
	onCategoryChange: (category: CatalogCategory) => void;
}) {
	const [view, setView] = useState<"grid" | "list">("grid");
	const term = query.trim().toLowerCase();
	const results = items.filter(
		(item) =>
			(category === "All" || item.category === category) &&
			`${item.name} ${item.category}`.toLowerCase().includes(term),
	);

	const pageSize = 24;
	const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
	const currentPage = Math.min(page, pageCount);
	const visible = results.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize,
	);

	return (
		<Window
			title="Item Catalog — Equipment Index"
			icon={FolderOpen}
			status={
				<StatusBar
					end={source === "wfcd" ? "WFCD equipment catalog" : "Sample catalog"}
				>
					<span aria-live="polite">
						{results.length} of {items.length} items
					</span>
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Item Catalog</h1>
					<p>
						{source === "wfcd"
							? "Browse Prime equipment and open a file to inspect its components."
							: "WFCD equipment is unavailable. Showing the local sample catalog."}
					</p>
				</div>
				<div className="catalog-toolbar">
					<div className="form-field catalog-search">
						<label htmlFor="item-search">Find equipment</label>
						<div className="search-input">
							<Search size={15} aria-hidden="true" />
							<RetroInput
								id="item-search"
								type="search"
								value={query}
								onChange={(event) => onQueryChange(event.target.value)}
								placeholder="Search by name or type"
							/>
						</div>
					</div>
					<fieldset className="view-buttons">
						<legend className="sr-only">Catalog view</legend>
						<RetroButton
							aria-label="Grid view"
							title="Grid view"
							aria-pressed={view === "grid"}
							onClick={() => setView("grid")}
						>
							<Grid2X2 size={16} aria-hidden="true" />
						</RetroButton>
						<RetroButton
							aria-label="List view"
							title="List view"
							aria-pressed={view === "list"}
							onClick={() => setView("list")}
						>
							<List size={17} aria-hidden="true" />
						</RetroButton>
					</fieldset>
				</div>
				<div className="catalog-browser">
					<RetroPanel className="category-panel">
						<h2>Categories</h2>
						{(["All", ...categories] as const).map((value) => (
							<button
								type="button"
								key={value}
								aria-pressed={category === value}
								onClick={() => onCategoryChange(value)}
							>
								<FolderOpen size={15} aria-hidden="true" />
								{value === "All" ? "All equipment" : value}
							</button>
						))}
					</RetroPanel>
					<RetroPanel className="catalog-results">
						{results.length ? (
							<ul className={`catalog-items catalog-items--${view}`}>
								{visible.map((item) => (
									<li key={item.slug}>
										<Link
											to="/items/$slug"
											preload={false}
											params={{ slug: item.slug }}
											className="catalog-file"
										>
											<ItemIcon
												artwork={item.artwork}
												size={view === "grid" ? "large" : "small"}
											/>
											<span className="catalog-file-meta">
												<strong>{item.name}</strong>
												<small>{item.category}</small>
											</span>
											<span className="edition">{item.edition}</span>
											<ArrowRight
												className="file-arrow"
												size={13}
												aria-hidden="true"
											/>
										</Link>
									</li>
								))}
							</ul>
						) : (
							<div className="empty-state">
								<Search size={28} aria-hidden="true" />
								<h2>No matching equipment</h2>
								<p>Try another name or select a different category.</p>
							</div>
						)}
						{pageCount > 1 && (
							<div className="catalog-pagination">
								<RetroButton
									disabled={currentPage === 1}
									onClick={() => onPageChange(currentPage - 1)}
								>
									Previous
								</RetroButton>
								<span aria-live="polite">
									Page {currentPage} of {pageCount}
								</span>
								<RetroButton
									disabled={currentPage === pageCount}
									onClick={() => onPageChange(currentPage + 1)}
								>
									Next
								</RetroButton>
							</div>
						)}
					</RetroPanel>
				</div>
			</div>
		</Window>
	);
}

export function CatalogLoading() {
	return (
		<Window
			title="Item Catalog — Equipment Index"
			icon={FolderOpen}
			status={<StatusBar>Loading index…</StatusBar>}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Item Catalog</h1>
					<output>Opening the equipment index…</output>
				</div>
				<RetroPanel className="loading-files" aria-hidden="true">
					<span />
					<span />
					<span />
				</RetroPanel>
			</div>
		</Window>
	);
}
