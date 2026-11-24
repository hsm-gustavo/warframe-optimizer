import { Link, useRouter } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	RetroButton,
	RetroInput,
	RetroPanel,
	RetroTabs,
	StatusBar,
} from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { type Refinement, refinements } from "#/features/catalog/models";
import { MarketPrices } from "#/features/catalog/prices";
import { completion } from "#/features/optimizer/planning";
import { authClient } from "#/lib/auth-client";
import {
	type loadPersonalFiles,
	type PersonalView,
	saveInventory,
	updateGoal,
} from "./personal-data";

type PersonalData = NonNullable<Awaited<ReturnType<typeof loadPersonalFiles>>>;
type Run = (action: () => Promise<unknown>) => void;
const tabs = [
	{ value: "equipment", label: "Equipment" },
	{ value: "parts", label: "Prime Parts" },
	{ value: "relics", label: "Relics" },
	{ value: "goals", label: "Farming Goals" },
] as const;

export function PersonalFiles({
	data,
	view,
	pick,
	onViewChange,
}: {
	data: PersonalData | null;
	view: PersonalView;
	pick?: string;
	onViewChange: (value: string) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [register, setRegister] = useState(false);
	const router = useRouter();
	const run: Run = async (action) => {
		setBusy(true);
		setError("");
		try {
			await action();
			await router.invalidate();
		} catch {
			setError(
				"The change could not be saved. Check your input and session, then try again.",
			);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Window
			title="Personal Files"
			icon={Archive}
			status={
				<StatusBar>
					{data ? `Signed in as ${data.user.name}` : "Guest"}
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Personal Files</h1>
				</div>
				{data ? (
					<>
						<div className="personal-toolbar">
							<RetroButton
								disabled={busy}
								onClick={() =>
									run(async () => {
										if ((await authClient.signOut()).error)
											throw new Error("Sign-out failed.");
									})
								}
							>
								Sign out
							</RetroButton>
						</div>
						<RetroTabs
							label="Personal files"
							value={view}
							onValueChange={onViewChange}
							tabs={tabs.map((tab) => ({
								...tab,
								content: (
									<InventoryTab
										key={`${tab.value}/${pick}`}
										data={data}
										view={tab.value}
										pick={pick}
										busy={busy}
										run={run}
									/>
								),
							}))}
						/>
					</>
				) : (
					<form
						className="sign-in-form"
						onSubmit={(event) => {
							event.preventDefault();
							const fields = new FormData(event.currentTarget);
							const credentials = {
								email: String(fields.get("email")),
								password: String(fields.get("password")),
							};
							run(async () => {
								const result = register
									? await authClient.signUp.email({
											...credentials,
											name: String(fields.get("name")),
										})
									: await authClient.signIn.email(credentials);
								if (result.error) throw new Error("Authentication failed.");
							});
						}}
					>
						{register && (
							<div className="form-field">
								<label htmlFor="account-name">Name</label>
								<RetroInput
									id="account-name"
									name="name"
									required
									maxLength={100}
									autoComplete="name"
								/>
							</div>
						)}
						<div className="form-field">
							<label htmlFor="account-email">Email</label>
							<RetroInput
								id="account-email"
								name="email"
								type="email"
								autoComplete="username"
								required
							/>
						</div>
						<div className="form-field">
							<label htmlFor="account-password">Password</label>
							<RetroInput
								id="account-password"
								name="password"
								type="password"
								autoComplete={register ? "new-password" : "current-password"}
								minLength={register ? 12 : undefined}
								required
							/>
						</div>
						<RetroButton
							type="submit"
							disabled={busy}
							className="primary-action"
						>
							{register ? "Create account" : "Sign in"}
						</RetroButton>
						<RetroButton disabled={busy} onClick={() => setRegister(!register)}>
							{register ? "Use an existing account" : "Create an account"}
						</RetroButton>
					</form>
				)}
				{error && (
					<p role="alert" className="form-message">
						{error}
					</p>
				)}
			</div>
		</Window>
	);
}

function InventoryTab({
	data,
	view,
	pick,
	busy,
	run,
}: {
	data: PersonalData;
	view: PersonalView;
	pick?: string;
	busy: boolean;
	run: Run;
}) {
	const [query, setQuery] = useState("");
	const [era, setEra] = useState("");
	const parts = new Map(
		data.items.flatMap((item) =>
			item.parts.map(
				(part) =>
					[
						part.id,
						{ id: part.id, name: `${item.name} ${part.name}` },
					] as const,
			),
		),
	);
	const options =
		view === "parts"
			? [...parts.values()]
			: view === "relics"
				? data.relicIndex.filter((record) => !era || era === record.era)
				: data.items.map(({ slug, name }) => ({ id: slug, name }));
	const names = new Map(options.map(({ id, name }) => [id, name]));
	const matches = (name: string) =>
		name.toLowerCase().includes(query.trim().toLowerCase());
	const candidates = options.filter(
		(option) => option.id === pick || matches(option.name),
	);
	const owned =
		view === "equipment"
			? data.equipment.map((entry) => ({
					id: entry.equipmentId,
					quantity: entry.quantity,
					refinement: undefined,
				}))
			: view === "parts"
				? data.parts.map((entry) => ({
						id: entry.componentId,
						quantity: entry.quantity,
						refinement: undefined,
					}))
				: data.relics
						.filter((entry) => !era || names.has(entry.relicId))
						.map((entry) => ({
							id: entry.relicId,
							quantity: entry.quantity,
							refinement: entry.refinement,
						}));

	function adjust(id: string, quantity: number, refinement?: Refinement) {
		if (view === "goals") return;
		const kind = view === "parts" ? "part" : "equipment";
		if (view === "relics") {
			if (refinement)
				run(() =>
					saveInventory({ data: { kind: "relic", id, quantity, refinement } }),
				);
		} else run(() => saveInventory({ data: { kind, id, quantity } }));
	}
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const fields = new FormData(event.currentTarget);
		const id = String(fields.get("item"));
		if (view === "goals")
			run(() => updateGoal({ data: { id, operation: "save" } }));
		else
			adjust(
				id,
				Number(fields.get("quantity")),
				refinements.find((level) => level === fields.get("refinement")),
			);
	}
	return (
		<div className="window-body">
			<form className="optimizer-toolbar" onSubmit={submit}>
				<div className="form-field">
					<label htmlFor={`filter-${view}`}>Filter</label>
					<RetroInput
						id={`filter-${view}`}
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				{view === "relics" && (
					<div className="form-field">
						<label htmlFor="inventory-era">Era</label>
						<select
							id="inventory-era"
							className="retro-input"
							value={era}
							onChange={(event) => setEra(event.target.value)}
						>
							<option value="">All eras</option>
							{[...new Set(data.relicIndex.map((record) => record.era))].map(
								(value) => (
									<option key={value}>{value}</option>
								),
							)}
						</select>
					</div>
				)}
				<div className="form-field">
					<label htmlFor={`pick-${view}`}>Record</label>
					<select
						id={`pick-${view}`}
						name="item"
						className="retro-input"
						key={pick}
						defaultValue={pick ?? ""}
						required
					>
						<option value="">Select a record</option>
						{candidates.map((option) => (
							<option key={option.id} value={option.id}>
								{option.name}
							</option>
						))}
					</select>
				</div>
				{view === "relics" && (
					<div className="form-field">
						<label htmlFor="inventory-refinement">Refinement</label>
						<select
							id="inventory-refinement"
							name="refinement"
							className="retro-input"
						>
							{refinements.map((level) => (
								<option key={level}>{level}</option>
							))}
						</select>
					</div>
				)}
				{view !== "goals" && (
					<div className="form-field">
						<label htmlFor={`quantity-${view}`}>Quantity</label>
						<RetroInput
							id={`quantity-${view}`}
							type="number"
							name="quantity"
							defaultValue={1}
							min={1}
							max={9999}
							required
						/>
					</div>
				)}
				<RetroButton type="submit" disabled={busy || !candidates.length}>
					{view === "goals" ? "Add goal" : "Save quantity"}
				</RetroButton>
			</form>
			{view === "goals" ? (
				<div className="goal-list">
					<p className="data-note">
						Progress is calculated independently for each goal. Parts are shared
						across these estimates and are never automatically consumed.
					</p>
					{!data.goals.length && (
						<p className="empty-state">No farming goals yet.</p>
					)}
					{data.goals
						.filter((goal) =>
							matches(names.get(goal.equipmentId) ?? goal.equipmentId),
						)
						.map((goal) => (
							<Goal
								key={goal.equipmentId}
								goal={goal}
								data={data}
								busy={busy}
								run={run}
							/>
						))}
				</div>
			) : (
				<ul className="personal-list">
					{owned
						.filter((record) => matches(names.get(record.id) ?? record.id))
						.map((record) => (
							<li key={`${record.id}/${record.refinement}`}>
								<span>
									{names.get(record.id) ?? record.id}
									{record.refinement && ` · ${record.refinement}`}
								</span>
								<strong>×{record.quantity}</strong>
								<div className="action-row">
									<RetroButton
										aria-label={`Decrease ${names.get(record.id) ?? record.id}`}
										disabled={busy}
										onClick={() =>
											adjust(record.id, record.quantity - 1, record.refinement)
										}
									>
										−
									</RetroButton>
									<RetroButton
										aria-label={`Increase ${names.get(record.id) ?? record.id}`}
										disabled={busy || record.quantity >= 9999}
										onClick={() =>
											adjust(record.id, record.quantity + 1, record.refinement)
										}
									>
										+
									</RetroButton>
									<RetroButton
										disabled={busy}
										onClick={() => adjust(record.id, 0, record.refinement)}
									>
										Remove
									</RetroButton>
								</div>
							</li>
						))}
					{!owned.length && <li>No owned records yet.</li>}
				</ul>
			)}
		</div>
	);
}

function Goal({
	goal,
	data,
	busy,
	run,
}: {
	goal: PersonalData["goals"][number];
	data: PersonalData;
	busy: boolean;
	run: Run;
}) {
	const [showPrices, setShowPrices] = useState(false);
	const item = data.items.find((entry) => entry.slug === goal.equipmentId);
	const parts = (item?.parts ?? []).map((part) => {
		const owned =
			data.parts.find((entry) => entry.componentId === part.id)?.quantity ?? 0;
		return { ...part, owned, missing: Math.max(0, part.quantity - owned) };
	});
	const progress = completion(parts);
	const relevant =
		data.goalSources.find((source) => source.slug === goal.equipmentId)
			?.relics ?? [];
	return (
		<RetroPanel className="text-panel">
			<h2>{item?.name ?? goal.equipmentId}</h2>
			<p>
				{goal.completedAt
					? "Completed"
					: progress === undefined
						? "Recipe progress unavailable"
						: `${progress}% of required parts owned`}
			</p>
			<div className="action-row phase-toolbar">
				<label>
					Priority{" "}
					<select
						className="retro-input inline-input"
						value={goal.priority}
						disabled={busy}
						onChange={(event) =>
							run(() =>
								updateGoal({
									data: {
										id: goal.equipmentId,
										priority: Number(event.target.value),
										operation: "save",
									},
								}),
							)
						}
					>
						<option value={1}>High</option>
						<option value={2}>Normal</option>
						<option value={3}>Low</option>
					</select>
				</label>
				<Link
					to="/optimizer"
					search={{ item: goal.equipmentId }}
					className="retro-button"
				>
					Open plan
				</Link>
				{!goal.completedAt && (
					<RetroButton
						disabled={busy}
						onClick={() =>
							run(() =>
								updateGoal({
									data: { id: goal.equipmentId, operation: "complete" },
								}),
							)
						}
					>
						Mark completed
					</RetroButton>
				)}
				<RetroButton
					disabled={busy}
					onClick={() =>
						run(() =>
							updateGoal({
								data: { id: goal.equipmentId, operation: "remove" },
							}),
						)
					}
				>
					Remove goal
				</RetroButton>
			</div>
			{parts.length > 0 && (
				<table className="retro-table">
					<thead>
						<tr>
							<th scope="col">Part</th>
							<th scope="col">Required</th>
							<th scope="col">Owned</th>
							<th scope="col">Missing</th>
							<th scope="col">Inventory</th>
						</tr>
					</thead>
					<tbody>
						{parts.map((part) => (
							<tr key={part.id}>
								<th scope="row">{part.name}</th>
								<td>{part.quantity}</td>
								<td>{part.owned}</td>
								<td>{part.missing}</td>
								<td>
									<RetroButton
										aria-label={`Add one ${part.name}`}
										disabled={busy || part.owned >= 9999}
										onClick={() =>
											run(() =>
												saveInventory({
													data: {
														id: part.id,
														kind: "part",
														quantity: part.owned + 1,
													},
												}),
											)
										}
									>
										+1
									</RetroButton>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			<p className="data-note">
				Relevant owned relics{" "}
				{relevant.length
					? relevant
							.flatMap((relic) =>
								data.relics
									.filter((entry) => entry.relicId === relic.id)
									.map(
										(entry) =>
											`${relic.name} ${entry.refinement} ×${entry.quantity}`,
									),
							)
							.join(", ")
					: "none recorded"}
				.
			</p>
			{!goal.completedAt && parts.some((part) => part.missing) && (
				<>
					<RetroButton onClick={() => setShowPrices(!showPrices)}>
						{showPrices
							? "Hide purchase cost"
							: "Check remaining purchase cost"}
					</RetroButton>
					<MarketPrices
						slug={goal.equipmentId}
						parts={parts}
						enabled={showPrices}
					/>
				</>
			)}
		</RetroPanel>
	);
}
