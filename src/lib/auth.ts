import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db/index";

const trustedIpHeader = process.env.AUTH_TRUSTED_IP_HEADER;

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12,
	},
	advanced: {
		ipAddress: { ipAddressHeaders: trustedIpHeader ? [trustedIpHeader] : [] },
	},
	rateLimit: {
		enabled: true,
		storage: "database",
		window: 60,
		max: 60,
		customRules: {
			"/sign-in/email": { window: 60, max: 10 },
			"/sign-up/email": { window: 60, max: 5 },
		},
	},
	plugins: [admin(), tanstackStartCookies()],
});
