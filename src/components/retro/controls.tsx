import { Tabs } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

export function RetroButton({
	className = "",
	type = "button",
	...props
}: ComponentProps<"button">) {
	return (
		<button type={type} className={`retro-button ${className}`} {...props} />
	);
}

export function RetroInput({
	className = "",
	...props
}: ComponentProps<"input">) {
	return <input className={`retro-input ${className}`} {...props} />;
}

export function RetroPanel({
	className = "",
	variant = "inset",
	...props
}: ComponentProps<"div"> & {
	variant?: "inset" | "raised";
}) {
	return <div className={`retro-panel ${variant} ${className}`} {...props} />;
}

export function RetroTabs({
	label,
	value,
	onValueChange,
	tabs,
}: {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	tabs: readonly { value: string; label: string; content: ReactNode }[];
}) {
	return (
		<Tabs.Root value={value} onValueChange={onValueChange}>
			<Tabs.List className="retro-tabs" aria-label={label}>
				{tabs.map((tab) => (
					<Tabs.Trigger key={tab.value} value={tab.value}>
						{tab.label}
					</Tabs.Trigger>
				))}
			</Tabs.List>
			{tabs.map((tab) => (
				<Tabs.Content key={tab.value} value={tab.value} className="tab-content">
					{tab.content}
				</Tabs.Content>
			))}
		</Tabs.Root>
	);
}

export function StatusBar({
	children,
	end,
}: {
	children: ReactNode;
	end?: ReactNode;
}) {
	return (
		<div className="status-bar">
			<span>{children}</span>
			{end && <span>{end}</span>}
		</div>
	);
}
