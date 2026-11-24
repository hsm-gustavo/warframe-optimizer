CREATE TABLE "component_inventory" (
	"userId" text NOT NULL,
	"componentId" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "component_inventory_userId_componentId_pk" PRIMARY KEY("userId","componentId"),
	CONSTRAINT "component_quantity_check" CHECK ("component_inventory"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "equipment_ownership" (
	"userId" text NOT NULL,
	"equipmentId" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "equipment_ownership_userId_equipmentId_pk" PRIMARY KEY("userId","equipmentId"),
	CONSTRAINT "equipment_quantity_check" CHECK ("equipment_ownership"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "farming_goal" (
	"userId" text NOT NULL,
	"equipmentId" text NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "farming_goal_userId_equipmentId_pk" PRIMARY KEY("userId","equipmentId"),
	CONSTRAINT "goal_priority_check" CHECK ("farming_goal"."priority" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "relic_inventory" (
	"userId" text NOT NULL,
	"relicId" text NOT NULL,
	"refinement" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "relic_inventory_userId_relicId_refinement_pk" PRIMARY KEY("userId","relicId","refinement"),
	CONSTRAINT "relic_quantity_check" CHECK ("relic_inventory"."quantity" > 0),
	CONSTRAINT "relic_refinement_check" CHECK ("relic_inventory"."refinement" in ('Intact', 'Exceptional', 'Flawless', 'Radiant'))
);
--> statement-breakpoint
ALTER TABLE "component_inventory" ADD CONSTRAINT "component_inventory_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_ownership" ADD CONSTRAINT "equipment_ownership_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farming_goal" ADD CONSTRAINT "farming_goal_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relic_inventory" ADD CONSTRAINT "relic_inventory_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "equipment_ownership" ("userId", "equipmentId", "quantity")
SELECT "userId", "itemSlug", "quantity" FROM "personal_entry"
WHERE "view" = 'inventory' AND "quantity" > 0
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "farming_goal" ("userId", "equipmentId", "priority")
SELECT "userId", "itemSlug", 2 FROM "personal_entry"
WHERE "view" = 'wishlist' AND "quantity" > 0
ON CONFLICT DO NOTHING;
