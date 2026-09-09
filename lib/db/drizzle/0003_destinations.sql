CREATE TYPE "public"."destination_kind" AS ENUM('region', 'mountains', 'city', 'thermal', 'heritage', 'nature');--> statement-breakpoint
CREATE TABLE "destinations" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "destination_kind" NOT NULL,
	"parent_slug" text,
	"radius_m" integer NOT NULL,
	"hero_image_url" text,
	"description" text,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_radius_positive" CHECK ("destinations"."radius_m" > 0),
	CONSTRAINT "destinations_parent_not_self" CHECK ("destinations"."parent_slug" IS NULL OR "destinations"."parent_slug" <> "destinations"."slug")
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_parent_slug_destinations_slug_fk" FOREIGN KEY ("parent_slug") REFERENCES "public"."destinations"("slug") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "destinations_kind_idx" ON "destinations" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "destinations_parent_idx" ON "destinations" USING btree ("parent_slug");--> statement-breakpoint
CREATE INDEX "destinations_active_idx" ON "destinations" USING btree ("is_active");