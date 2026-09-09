CREATE TYPE "public"."cancellation_policy" AS ENUM('flexible', 'standard', 'strict');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending', 'published');--> statement-breakpoint
CREATE TYPE "public"."rental_form" AS ENUM('entire_place', 'private_room', 'shared_room');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('draft', 'request_pending', 'awaiting_payment', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."block_source" AS ENUM('booking', 'hold', 'manual', 'ical');--> statement-breakpoint
CREATE TABLE "kraje" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okresy" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kraj_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"property_type" text,
	"rental_form" "rental_form",
	"max_guests" integer DEFAULT 1 NOT NULL,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"max_nights" integer,
	"base_price_cents" integer NOT NULL,
	"per_person_price_cents" integer,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"cancellation_policy" "cancellation_policy" DEFAULT 'standard' NOT NULL,
	"street_address" text,
	"city" text,
	"okres_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text,
	"guest_date_of_birth" date,
	"guest_confirmed_adult_at" timestamp with time zone,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"guest_count" integer NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"total_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"host_payout_cents" integer NOT NULL,
	"cancellation_policy_snapshot" jsonb NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"stripe_transfer_id" text,
	"stripe_refund_id" text,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"legacy_mongo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_legacy_mongo_id_unique" UNIQUE("legacy_mongo_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"stay" daterange NOT NULL,
	"source" "block_source" NOT NULL,
	"booking_id" uuid,
	"feed_id" uuid,
	"ics_uid" text,
	"hold_expires_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "okresy" ADD CONSTRAINT "okresy_kraj_code_kraje_code_fk" FOREIGN KEY ("kraj_code") REFERENCES "public"."kraje"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_host_id_putko_test_guests_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."putko_test_guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_okres_code_okresy_code_fk" FOREIGN KEY ("okres_code") REFERENCES "public"."okresy"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_host_id_idx" ON "listings" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_okres_idx" ON "listings" USING btree ("okres_code");--> statement-breakpoint
CREATE INDEX "bookings_listing_id_idx" ON "bookings" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_guest_email_idx" ON "bookings" USING btree ("guest_email");--> statement-breakpoint
CREATE INDEX "calendar_blocks_listing_id_idx" ON "calendar_blocks" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "calendar_blocks_booking_id_idx" ON "calendar_blocks" USING btree ("booking_id");