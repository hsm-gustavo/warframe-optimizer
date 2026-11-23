import { Link, useRouter } from "@tanstack/react-router";
import { Archive, Box, Heart, History } from "lucide-react";
import { useState } from "react";
import {
	RetroButton,
	RetroInput,
	RetroTabs,
	StatusBar,
} from "#/components/retro/controls";
import { Window } from "#/components/retro/window";
import { authClient } from "#/lib/auth-client";
import {
	type loadPersonalFiles,
	type PersonalView,
	savePersonalEntry,
} from "./personal-data";

type PersonalData = NonNullable<Awaited<ReturnType<typeof loadPersonalFiles>>>;

export const personalViews = [
	{
		value: "inventory",
		label: "Inventory",
		icon: Box,
		empty: "No inventory records",
		action: "Save quantity",
	},
	{
		value: "wishlist",
		label: "Wishlist",
		icon: Heart,
		empty: "No wishlist entries",
		action: "Add to wishlist",
	},
	{
		value: "history",
		label: "Farming History",
		icon: History,
		empty: "No farming history",
		action: "Record acquisition",
	},
] as const;

export function PersonalFiles({
	view,
	onViewChange,
	data,
}: {
	view: PersonalView;
	onViewChange: (view: string) => void;
	data: PersonalData | null;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");

	async function run(action: () => Promise<void>) {
		setBusy(true);
		setMessage("");
		try {
			await action();
			await router.invalidate();
		} catch {
			setMessage("The request failed. Check your session and try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Window
			title="Personal Files"
			icon={Archive}
			status={
				<StatusBar
					end={data?.user.role === "admin" ? "Administrator" : undefined}
				>
					{data ? `Signed in as ${data.user.name}` : "Guest"}
				</StatusBar>
			}
		>
			<div className="window-body">
				<div className="page-heading">
					<h1>Personal Files</h1>
					<p>
						{data
							? "Track your Prime equipment and farming progress."
							: "Sign in to open your saved inventory, wishlist, and farming history."}
					</p>
				</div>
				{data ? (
					<>
						<div className="personal-toolbar">
							<RetroButton
								disabled={busy}
								onClick={() =>
									void run(async () => {
										const result = await authClient.signOut();
										if (result.error) throw result.error;
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
							tabs={personalViews.map(({ icon: Icon, ...tab }) => ({
								...tab,
								content: (
									<div className="window-body">
										<form
											className="optimizer-toolbar"
											onSubmit={(event) => {
												event.preventDefault();
												const fields = new FormData(event.currentTarget);
												void run(() =>
													savePersonalEntry({
														data: {
															view: tab.value,
															itemSlug: String(fields.get("item")),
															quantity: Number(fields.get("quantity") ?? 1),
														},
													}),
												);
											}}
										>
											<label className="form-field">
												Equipment
												<select className="retro-input" name="item" required>
													{data.items.map((item) => (
														<option key={item.slug} value={item.slug}>
															{item.name}
														</option>
													))}
												</select>
											</label>
											{tab.value === "inventory" && (
												<label
													className="form-field"
													htmlFor="personal-quantity"
												>
													Quantity
													<RetroInput
														type="number"
														id="personal-quantity"
														name="quantity"
														min={1}
														max={9999}
														defaultValue={1}
														required
													/>
												</label>
											)}
											<RetroButton type="submit" disabled={busy}>
												{tab.action}
											</RetroButton>
										</form>
										{data.entries.some((entry) => entry.view === tab.value) ? (
											<ul className="personal-list">
												{data.entries
													.filter((entry) => entry.view === tab.value)
													.map((entry) => (
														<li key={entry.itemSlug}>
															<Link
																to="/items/$slug"
																params={{ slug: entry.itemSlug }}
															>
																{data.items.find(
																	(item) => item.slug === entry.itemSlug,
																)?.name ?? entry.itemSlug}
															</Link>
															{tab.value === "inventory" && (
																<span>×{entry.quantity}</span>
															)}
															{tab.value === "history" && (
																<time dateTime={entry.updatedAt.slice(0, 10)}>
																	{entry.updatedAt.slice(0, 10)}
																</time>
															)}
															<RetroButton
																disabled={busy}
																onClick={() =>
																	void run(() =>
																		savePersonalEntry({
																			data: {
																				view: entry.view,
																				itemSlug: entry.itemSlug,
																				quantity: 0,
																			},
																		}),
																	)
																}
															>
																Remove
															</RetroButton>
														</li>
													))}
											</ul>
										) : (
											<div className="empty-state">
												<Icon size={30} aria-hidden="true" />
												<h2>{tab.empty}</h2>
											</div>
										)}
									</div>
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
							void run(async () => {
								const result = await authClient.signIn.email({
									email: String(fields.get("email")),
									password: String(fields.get("password")),
								});
								if (result.error) throw result.error;
							});
						}}
					>
						<label className="form-field" htmlFor="personal-email">
							Email
							<RetroInput
								id="personal-email"
								name="email"
								type="email"
								autoComplete="username"
								required
							/>
						</label>
						<label className="form-field" htmlFor="personal-password">
							Password
							<RetroInput
								id="personal-password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
							/>
						</label>
						<RetroButton
							type="submit"
							className="primary-action"
							disabled={busy}
						>
							{busy ? "Signing in…" : "Sign in"}
						</RetroButton>
					</form>
				)}
				{message && (
					<p className="form-message" role="alert">
						{message}
					</p>
				)}
			</div>
		</Window>
	);
}
