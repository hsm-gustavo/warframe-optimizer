import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const email = "admin@orbital.test";
const credentialsFile = ".admin-credentials.local";

try {
	const [existing] = await db.select({ role: user.role }).from(user).where(eq(user.email, email));
	if (existing && existing.role !== "admin") {
		throw new Error("The test email belongs to an existing non-admin account.");
	}

	if (!existing) {
		try {
			const password = randomBytes(24).toString("base64url");
			await writeFile(credentialsFile, JSON.stringify({ email, password }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
		} catch (error) {
			if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
		}
	}
	const credentials = JSON.parse(await readFile(credentialsFile, "utf8"));
	if (credentials.email !== email || typeof credentials.password !== "string") throw new Error("Invalid local admin credentials file.");
	const { password } = credentials;
	if (!existing) {
		await auth.api.createUser({ body: { email, password, name: "Field Desk Admin", role: "admin" } });
	}
	const signedIn = await auth.api.signInEmail({ body: { email, password } });
	if (signedIn.user.role !== "admin") throw new Error("The test account failed the admin role check.");
	console.log(`Verified ${email} with role admin. Credentials are in ${credentialsFile}.`);
} finally {
	await db.$client.end();
}
