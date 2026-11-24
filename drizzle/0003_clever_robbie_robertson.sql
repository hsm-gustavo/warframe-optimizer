CREATE SCHEMA IF NOT EXISTS "orbital_archive";
--> statement-breakpoint
ALTER TABLE "todos" SET SCHEMA "orbital_archive";
--> statement-breakpoint
ALTER TABLE "personal_entry" SET SCHEMA "orbital_archive";
