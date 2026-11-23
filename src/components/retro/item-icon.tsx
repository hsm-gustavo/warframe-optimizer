const illustrations = {
	sentinel: (
		<>
			<path
				fill="var(--art-shadow)"
				d="M6 22l12 1 8-9h12l8 9 12-1-4 20-11-4-11 13-11-13-11 4z"
			/>
			<path
				fill="var(--art-metal)"
				d="M10 26l11 2 7-10h8l7 10 11-2-3 11-10-3-9 11-9-11-10 3z"
			/>
			<path fill="var(--art-light)" d="M25 27l7-9 7 9-7 12z" />
			<path
				fill="var(--art-accent)"
				d="M28 27l4-3 4 3-4 5zM14 28l5 1-3 3zm36 0-5 1 3 3z"
			/>
		</>
	),
	frame: (
		<>
			<path
				fill="var(--art-shadow)"
				d="M8 56l3-12 12-7 5 6h8l5-6 12 7 3 12-11-4-4 8H23l-4-8z"
			/>
			<path fill="var(--art-metal)" d="M13 48l12-8 7 8 7-8 12 8-12 7H25z" />
			<path fill="var(--art-shadow)" d="M19 19L32 7l13 12-2 16-11 9-11-9z" />
			<path fill="var(--art-metal)" d="M22 21l10-10 10 10-2 10-8 10-8-10z" />
			<path fill="var(--art-light)" d="M32 11l5 11-5 14-5-14z" />
			<path
				fill="var(--art-accent)"
				d="M20 24l10 5-5 2zm24 0l-10 5 5 2zM29 51h6l-3 5z"
			/>
		</>
	),
	rifle: (
		<>
			<path
				fill="var(--art-shadow)"
				d="M6 41l10-12 18 1 15-12 10-1 2 6-14 9-11 6-5 13-8 1 1-10-12 7z"
			/>
			<path
				fill="var(--art-metal)"
				d="M10 41l9-9 16 1 17-12 5 1-13 10-13 5-13 2-6 6z"
			/>
			<path
				fill="var(--art-light)"
				d="M22 33l4-6 12 1-7 6zm15 4l7-5-5 13-7 4z"
			/>
			<path
				fill="var(--art-accent)"
				d="M26 35l9-1-4 3h-8zm24-10l7-5 3 1-7 5z"
			/>
		</>
	),
	sidearm: (
		<>
			<path
				fill="var(--art-shadow)"
				d="M10 53l7-15-3-7 5-10 28-5 10 7-5 8-19 4-6 7-3 13z"
			/>
			<path
				fill="var(--art-metal)"
				d="M18 28l5-5 26-4 4 4-6 4-20 5zm1 13l8-4-5 14-8 1z"
			/>
			<path fill="var(--art-light)" d="M28 33l19-5-9 8-9 2z" />
			<path fill="var(--art-accent)" d="M24 25l21-4-6 4-15 3z" />
		</>
	),
	blade: (
		<>
			<path
				fill="var(--art-shadow)"
				d="M8 49l10-10 5 1-2-9 7 1L48 9l11-5-4 13-21 24 1 7-10-2-13 13z"
			/>
			<path
				fill="var(--art-metal)"
				d="M29 36L50 12l6-5-4 8-21 24zM12 50l9-9 3 3-11 11z"
			/>
			<path fill="var(--art-light)" d="M32 36l12-16 10-10-4 8z" />
			<path fill="var(--art-accent)" d="M22 34l7 1 5 10-8-4z" />
		</>
	),
};

export type ItemArtwork = keyof typeof illustrations;

export function ItemIcon({
	artwork,
	size = "small",
}: {
	artwork: ItemArtwork;
	size?: "small" | "large";
}) {
	return (
		<span
			className={`item-icon item-icon--${artwork} item-icon--${size}`}
			aria-hidden="true"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 64 64"
				fill="none"
				shapeRendering="geometricPrecision"
			>
				<path
					d="M4 15V4h11m34 0h11v11m0 34v11H49m-34 0H4V49M30 4h4m-4 56h4"
					stroke="currentColor"
					opacity=".42"
				/>
				{illustrations[artwork]}
			</svg>
		</span>
	);
}
