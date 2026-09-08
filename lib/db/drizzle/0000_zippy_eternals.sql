CREATE TYPE "public"."putko_test_host_accommodation_status" AS ENUM('DRAFT', 'READY', 'LIVE');--> statement-breakpoint
CREATE TABLE "putko_test_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"gender" text NOT NULL,
	"language" text DEFAULT 'Slovak' NOT NULL,
	"role" text DEFAULT 'guest' NOT NULL,
	"host_activated_at" timestamp with time zone,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_token_hash" text,
	"verification_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "putko_test_guests_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "putko_test_guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"active_mode" text DEFAULT 'guest' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "putko_test_guest_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "putko_test_guest_favorites" (
	"guest_id" uuid NOT NULL,
	"accommodation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "putko_test_guest_favorites_guest_id_accommodation_id_pk" PRIMARY KEY("guest_id","accommodation_id")
);
--> statement-breakpoint
CREATE TABLE "putko_test_host_accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "putko_test_host_accommodation_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "putko_test_guest_sessions" ADD CONSTRAINT "putko_test_guest_sessions_guest_id_putko_test_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."putko_test_guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "putko_test_guest_favorites" ADD CONSTRAINT "putko_test_guest_favorites_guest_id_putko_test_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."putko_test_guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "putko_test_host_accommodations" ADD CONSTRAINT "putko_test_host_accommodations_owner_id_putko_test_guests_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."putko_test_guests"("id") ON DELETE cascade ON UPDATE no action;