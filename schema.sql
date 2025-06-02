

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."dream_category" AS ENUM (
    'nightmare',
    'lucid',
    'recurring',
    'prophetic',
    'normal'
);


ALTER TYPE "public"."dream_category" OWNER TO "postgres";


CREATE TYPE "public"."dream_emotion" AS ENUM (
    'joy',
    'fear',
    'confusion',
    'anxiety',
    'peace',
    'excitement',
    'sadness',
    'neutral'
);


ALTER TYPE "public"."dream_emotion" OWNER TO "postgres";


CREATE TYPE "public"."dream_type" AS ENUM (
    'recurring nightmare',
    'positive',
    'lucid'
);


ALTER TYPE "public"."dream_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_table_column_exists"("p_table_name" "text", "p_column_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
        AND column_name = p_column_name
    ) INTO column_exists;
    
    RETURN column_exists;
END;
$$;


ALTER FUNCTION "public"."check_table_column_exists"("p_table_name" "text", "p_column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_user_analyses_since"("user_id_input" "uuid", "since_date" timestamp with time zone) RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM dream_analyses
  WHERE 
    user_id = user_id_input AND
    created_at >= since_date;
$$;


ALTER FUNCTION "public"."count_user_analyses_since"("user_id_input" "uuid", "since_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_user_usage_since"("user_id_input" "uuid", "usage_type" "text", "since_date" timestamp with time zone) RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(SUM(count), 0)::INTEGER
  FROM usage_logs
  WHERE 
    user_id = user_id_input AND
    type = usage_type AND
    created_at >= since_date;
$$;


ALTER FUNCTION "public"."count_user_usage_since"("user_id_input" "uuid", "usage_type" "text", "since_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_stripe_columns"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Add stripe_customer_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- Add subscription_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_id TEXT;
  END IF;

  -- Add subscription_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT;
  END IF;

  -- Add subscription_period_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_stripe_customer_id'
  ) THEN
    CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
  END IF;
END;
$$;


ALTER FUNCTION "public"."create_stripe_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_cancellation_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If canceled_at is being set but cancel_at_period_end remains false,
  -- automatically set cancel_at_period_end to true
  IF NEW.canceled_at IS NOT NULL AND NOT NEW.cancel_at_period_end THEN
    NEW.cancel_at_period_end := TRUE;
  END IF;
  
  -- If setting cancel_at_period_end to true but canceled_at is null,
  -- set canceled_at to current timestamp
  IF NEW.cancel_at_period_end AND NEW.canceled_at IS NULL THEN
    NEW.canceled_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_cancellation_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."maintain_subscription_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Fix for incorrect Stripe status where canceled but should be active+cancel_at_period_end
  -- This happens when Stripe returns 'canceled' status when immediate_cancel=false
  IF NEW.status = 'canceled' AND (NEW.current_period_end IS NULL OR NEW.current_period_end > NOW()) THEN
    -- This is likely a cancellation at period end, not immediate
    NEW.status := 'active';
    NEW.cancel_at_period_end := TRUE;
    NEW.canceled_at := COALESCE(NEW.canceled_at, NOW());
    
    RAISE NOTICE 'Corrected Stripe canceled status to active with cancel_at_period_end=true for subscription %', NEW.id;
  END IF;
  
  -- Handle cancellations (active → will cancel at period end)
  IF NEW.cancel_at_period_end = TRUE AND OLD.cancel_at_period_end = FALSE THEN
    -- Always record when the cancellation happened if not already set
    IF NEW.canceled_at IS NULL THEN
      NEW.canceled_at := NOW();
      RAISE NOTICE 'Setting canceled_at to now() for subscription %', NEW.id;
    END IF;
    
    -- Make sure status remains "active" until period end for canceling subscriptions
    IF NEW.status != 'active' THEN
      NEW.status := 'active';
      RAISE NOTICE 'Correcting status to "active" for subscription % (during cancellation)', NEW.id;
    END IF;
    
    -- Ensure current_period_end exists (fall back to 30 days if not set)
    IF NEW.current_period_end IS NULL THEN
      NEW.current_period_end := NOW() + INTERVAL '30 days';
      RAISE NOTICE 'Setting default current_period_end to 30 days from now for subscription %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."maintain_subscription_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."dream_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dream_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "themes" "text"[] NOT NULL,
    "symbols" "text"[] NOT NULL,
    "emotions" "text"[] NOT NULL,
    "interpretation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "dream_analyses_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."dream_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dreams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "public"."dream_category" DEFAULT 'normal'::"public"."dream_category" NOT NULL,
    "emotion" "public"."dream_emotion" DEFAULT 'neutral'::"public"."dream_emotion" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_url" "text",
    "enhanced_description" "text",
    "view_count" integer DEFAULT 0 NOT NULL,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "dream_date" "date",
    "dream_type" "public"."dream_type",
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    CONSTRAINT "dreams_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'friends_only'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."dreams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "bio" "text",
    "website" "text",
    "email" "text",
    "password_hash" "text",
    "stripe_customer_id" "text",
    "subscription_id" "text",
    "subscription_status" "text",
    "subscription_period_end" timestamp with time zone,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at",
    "d"."dream_type",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."dream_date"
   FROM (("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")));


ALTER TABLE "public"."combined_dreams_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view4" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    "p"."email",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at"
   FROM (("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")));


ALTER TABLE "public"."combined_dreams_view4" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view_email" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    COALESCE("p"."email", ("au"."email")::"text") AS "user_email",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at",
    "d"."dream_type",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."dream_date"
   FROM ((("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "auth"."users" "au" ON (("p"."id" = "au"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")));


ALTER TABLE "public"."combined_dreams_view_email" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view_email2" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    "p"."email",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at",
    "d"."dream_type",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."dream_date"
   FROM (("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")));


ALTER TABLE "public"."combined_dreams_view_email2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view_email3" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    "p"."email" AS "user_email",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at",
    "d"."dream_type",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."dream_date"
   FROM (("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")));


ALTER TABLE "public"."combined_dreams_view_email3" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."combined_dreams_view_email4" WITH ("security_invoker"='on') AS
 SELECT "p"."username",
    "p"."email" AS "user_email",
    "d"."title" AS "dream_title",
    "d"."description" AS "dream_description",
    "da"."interpretation" AS "dream_analysis",
    "da"."rating",
    "da"."themes",
    "da"."symbols",
    "da"."emotions",
    "d"."created_at" AS "dream_created_at",
    "d"."dream_type",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."dream_date",
    "d"."user_id",
    "p"."id" AS "profile_id"
   FROM (("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")))
     LEFT JOIN "public"."dream_analyses" "da" ON (("d"."id" = "da"."dream_id")))
  WHERE ("p"."email" IS NOT NULL);


ALTER TABLE "public"."combined_dreams_view_email4" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "parent_comment_id" "uuid",
    "likes_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "subscription_id" "text",
    "customer_portal_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "status" "text",
    "stripe_session_id" "text",
    "subscription_status" "text",
    CONSTRAINT "check_active_subscription_not_canceled" CHECK ((("status" <> 'active'::"text") OR ("canceled_at" IS NULL) OR ("current_period_end" > "canceled_at"))),
    CONSTRAINT "check_canceled_subscription_has_date" CHECK ((("status" <> 'canceled'::"text") OR ("canceled_at" IS NOT NULL)))
);


ALTER TABLE "public"."customer_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_subscriptions" IS 'Stores subscription information for users';



CREATE TABLE IF NOT EXISTS "public"."dream_media" (
    "media_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dream_id" "uuid" NOT NULL,
    "media_type" "text" NOT NULL,
    "media_url" "text" NOT NULL,
    "metadata" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "dream_media_type_check" CHECK (("media_type" = ANY (ARRAY['audio'::"text", 'video'::"text", 'image'::"text", 'text'::"text"])))
);


ALTER TABLE "public"."dream_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dream_tags" (
    "dream_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."dream_tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."extended_dreams_view" WITH ("security_invoker"='on') AS
 SELECT "d"."id" AS "dream_id",
    "d"."user_id",
    "p"."username",
    "p"."avatar_url",
    "d"."title",
    "d"."description",
    "d"."dream_type",
    "d"."category",
    "d"."emotion",
    "d"."visibility",
    "d"."view_count",
    "d"."likes_count",
    "d"."image_url",
    "d"."dream_date",
    "d"."created_at",
    "d"."updated_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."comments" "c"
          WHERE ("c"."dream_id" = "d"."id")) AS "comments_count"
   FROM ("public"."dreams" "d"
     JOIN "public"."profiles" "p" ON (("d"."user_id" = "p"."id")));


ALTER TABLE "public"."extended_dreams_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendship" (
    "user_id" "uuid" NOT NULL,
    "friend_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "friendship_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."friendship" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "dream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reaction_type" "text" DEFAULT 'like'::"text" NOT NULL,
    "entity_type" "text" DEFAULT 'dream'::"text" NOT NULL,
    CONSTRAINT "likes_entity_check" CHECK (("entity_type" = ANY (ARRAY['dream'::"text", 'comment'::"text"]))),
    CONSTRAINT "likes_reaction_check" CHECK (("reaction_type" = ANY (ARRAY['like'::"text", 'love'::"text", 'laugh'::"text", 'angry'::"text"])))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes_backup" (
    "dream_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."likes_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."share" (
    "share_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dream_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shared_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "message" "text"
);


ALTER TABLE "public"."share" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sleep_tracking" (
    "sleep_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sleep_date" "date" NOT NULL,
    "sleep_start" timestamp with time zone NOT NULL,
    "sleep_end" timestamp with time zone NOT NULL,
    "sleep_duration" integer NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."sleep_tracking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."subscription_status_summary" WITH ("security_invoker"='on') AS
 SELECT "customer_subscriptions"."status",
    "customer_subscriptions"."cancel_at_period_end",
    "count"(*) AS "count",
    "count"(
        CASE
            WHEN ("customer_subscriptions"."canceled_at" IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS "with_canceled_at",
    "count"(
        CASE
            WHEN ("customer_subscriptions"."current_period_end" IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS "with_period_end",
    "min"("customer_subscriptions"."current_period_end") AS "earliest_period_end",
    "max"("customer_subscriptions"."current_period_end") AS "latest_period_end"
   FROM "public"."customer_subscriptions"
  GROUP BY "customer_subscriptions"."status", "customer_subscriptions"."cancel_at_period_end"
  ORDER BY "customer_subscriptions"."status", "customer_subscriptions"."cancel_at_period_end";


ALTER TABLE "public"."subscription_status_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usage_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."dream_analyses"
    ADD CONSTRAINT "dream_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dream_media"
    ADD CONSTRAINT "dream_media_pkey" PRIMARY KEY ("media_id");



ALTER TABLE ONLY "public"."dream_tags"
    ADD CONSTRAINT "dream_tags_pkey" PRIMARY KEY ("dream_id", "tag_id");



ALTER TABLE ONLY "public"."dreams"
    ADD CONSTRAINT "dreams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendship"
    ADD CONSTRAINT "friendship_pkey" PRIMARY KEY ("user_id", "friend_user_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("dream_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."share"
    ADD CONSTRAINT "share_pkey" PRIMARY KEY ("share_id");



ALTER TABLE ONLY "public"."sleep_tracking"
    ADD CONSTRAINT "sleep_tracking_pkey" PRIMARY KEY ("sleep_id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_logs"
    ADD CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "customer_subscriptions_stripe_customer_id_idx" ON "public"."customer_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "customer_subscriptions_subscription_id_idx" ON "public"."customer_subscriptions" USING "btree" ("subscription_id");



CREATE INDEX "customer_subscriptions_user_id_idx" ON "public"."customer_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_customer_subscriptions_cancel" ON "public"."customer_subscriptions" USING "btree" ("cancel_at_period_end");



CREATE INDEX "idx_customer_subscriptions_period_end" ON "public"."customer_subscriptions" USING "btree" ("current_period_end");



CREATE INDEX "idx_customer_subscriptions_status" ON "public"."customer_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_customer_subscriptions_subscription_status" ON "public"."customer_subscriptions" USING "btree" ("subscription_status");



CREATE INDEX "idx_dream_analyses_user_id" ON "public"."dream_analyses" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_usage_logs_created_at" ON "public"."usage_logs" USING "btree" ("created_at");



CREATE INDEX "idx_usage_logs_type" ON "public"."usage_logs" USING "btree" ("type");



CREATE INDEX "idx_usage_logs_user_id" ON "public"."usage_logs" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "ensure_subscription_cancellation_consistency" BEFORE UPDATE ON "public"."customer_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_cancellation_consistency"();



CREATE OR REPLACE TRIGGER "ensure_subscription_integrity" BEFORE INSERT OR UPDATE ON "public"."customer_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."maintain_subscription_integrity"();



CREATE OR REPLACE TRIGGER "handle_updated_at_comments" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_dream_analyses" BEFORE UPDATE ON "public"."dream_analyses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_dreams" BEFORE UPDATE ON "public"."dreams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_profiles" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."usage_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_subscriptions"
    ADD CONSTRAINT "customer_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_analyses"
    ADD CONSTRAINT "dream_analyses_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_analyses"
    ADD CONSTRAINT "dream_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_media"
    ADD CONSTRAINT "dream_media_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_tags"
    ADD CONSTRAINT "dream_tags_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dream_tags"
    ADD CONSTRAINT "dream_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dreams"
    ADD CONSTRAINT "dreams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "fk_comment_parent" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendship"
    ADD CONSTRAINT "friendship_friend_user_id_fkey" FOREIGN KEY ("friend_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendship"
    ADD CONSTRAINT "friendship_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share"
    ADD CONSTRAINT "share_dream_id_fkey" FOREIGN KEY ("dream_id") REFERENCES "public"."dreams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share"
    ADD CONSTRAINT "share_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sleep_tracking"
    ADD CONSTRAINT "sleep_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_logs"
    ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can comment on public dreams" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ( SELECT ("dreams"."visibility" = 'public')
   FROM "public"."dreams"
  WHERE ("dreams"."id" = "comments"."dream_id"))));



CREATE POLICY "Authenticated users can insert tags" ON "public"."tags" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Comments on private dreams are viewable by the dream owner" ON "public"."comments" FOR SELECT USING (("auth"."uid"() = ( SELECT "dreams"."user_id"
   FROM "public"."dreams"
  WHERE ("dreams"."id" = "comments"."dream_id"))));



CREATE POLICY "Comments on public dreams are viewable by everyone" ON "public"."comments" FOR SELECT USING (( SELECT ("dreams"."visibility" = 'public')
   FROM "public"."dreams"
  WHERE ("dreams"."id" = "comments"."dream_id")));



CREATE POLICY "Dream tags are viewable by everyone" ON "public"."dream_tags" FOR SELECT USING (true);



CREATE POLICY "Likes are viewable by everyone" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Private dreams are viewable by the owner" ON "public"."dreams" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public dreams are viewable by everyone" ON "public"."dreams" FOR SELECT USING (("visibility" = 'public'));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can manage customer_subscriptions" ON "public"."customer_subscriptions" USING (true);



CREATE POLICY "Tags are viewable by everyone" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Users can create friendship requests" ON "public"."friendship" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can delete tags from their own dreams" ON "public"."dream_tags" FOR DELETE USING (("auth"."uid"() = ( SELECT "dreams"."user_id"
   FROM "public"."dreams"
  WHERE ("dreams"."id" = "dream_tags"."dream_id"))));



CREATE POLICY "Users can delete their own analyses" ON "public"."dream_analyses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own dreams" ON "public"."dreams" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own friendship records" ON "public"."friendship" FOR DELETE USING (((("auth"."uid"())::"text" = ("user_id")::"text") OR (("auth"."uid"())::"text" = ("friend_user_id")::"text")));



CREATE POLICY "Users can delete their own likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert tags to their own dreams" ON "public"."dream_tags" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "dreams"."user_id"
   FROM "public"."dreams"
  WHERE ("dreams"."id" = "dream_tags"."dream_id"))));



CREATE POLICY "Users can insert their own analyses" ON "public"."dream_analyses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own dream analyses" ON "public"."dream_analyses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."dreams"
  WHERE (("dreams"."id" = "dream_analyses"."dream_id") AND ("dreams"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own dreams" ON "public"."dreams" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update friendship status for requests they received" ON "public"."friendship" FOR UPDATE USING ((("auth"."uid"())::"text" = ("friend_user_id")::"text"));



CREATE POLICY "Users can update their own analyses" ON "public"."dream_analyses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own dreams" ON "public"."dreams" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own customer_subscriptions" ON "public"."customer_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own analyses" ON "public"."dream_analyses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own dream analyses" ON "public"."dream_analyses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."dreams"
  WHERE (("dreams"."id" = "dream_analyses"."dream_id") AND ("dreams"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own friendships" ON "public"."friendship" FOR SELECT USING (((("auth"."uid"())::"text" = ("user_id")::"text") OR (("auth"."uid"())::"text" = ("friend_user_id")::"text")));



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dream_analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dream_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dream_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dreams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendship" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_friendships" ON "public"."friendship" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "select_own_friendships" ON "public"."likes_backup" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "select_own_friendships" ON "public"."share" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "select_own_friendships" ON "public"."sleep_tracking" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."share" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sleep_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usage_logs_insert_policy" ON "public"."usage_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "usage_logs_select_policy" ON "public"."usage_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "usage_logs_service_role_policy" ON "public"."usage_logs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "usage_logs_update_policy" ON "public"."usage_logs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."check_table_column_exists"("p_table_name" "text", "p_column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_table_column_exists"("p_table_name" "text", "p_column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_table_column_exists"("p_table_name" "text", "p_column_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_user_analyses_since"("user_id_input" "uuid", "since_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."count_user_analyses_since"("user_id_input" "uuid", "since_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_user_analyses_since"("user_id_input" "uuid", "since_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_user_usage_since"("user_id_input" "uuid", "usage_type" "text", "since_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."count_user_usage_since"("user_id_input" "uuid", "usage_type" "text", "since_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_user_usage_since"("user_id_input" "uuid", "usage_type" "text", "since_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_stripe_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_stripe_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stripe_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_cancellation_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_cancellation_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_cancellation_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."maintain_subscription_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."maintain_subscription_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."maintain_subscription_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."dream_analyses" TO "anon";
GRANT ALL ON TABLE "public"."dream_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."dream_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."dreams" TO "anon";
GRANT ALL ON TABLE "public"."dreams" TO "authenticated";
GRANT ALL ON TABLE "public"."dreams" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view4" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view4" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view4" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view_email" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view_email" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view_email" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view_email2" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view_email2" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view_email2" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view_email3" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view_email3" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view_email3" TO "service_role";



GRANT ALL ON TABLE "public"."combined_dreams_view_email4" TO "anon";
GRANT ALL ON TABLE "public"."combined_dreams_view_email4" TO "authenticated";
GRANT ALL ON TABLE "public"."combined_dreams_view_email4" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."customer_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."customer_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."dream_media" TO "anon";
GRANT ALL ON TABLE "public"."dream_media" TO "authenticated";
GRANT ALL ON TABLE "public"."dream_media" TO "service_role";



GRANT ALL ON TABLE "public"."dream_tags" TO "anon";
GRANT ALL ON TABLE "public"."dream_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."dream_tags" TO "service_role";



GRANT ALL ON TABLE "public"."extended_dreams_view" TO "anon";
GRANT ALL ON TABLE "public"."extended_dreams_view" TO "authenticated";
GRANT ALL ON TABLE "public"."extended_dreams_view" TO "service_role";



GRANT ALL ON TABLE "public"."friendship" TO "anon";
GRANT ALL ON TABLE "public"."friendship" TO "authenticated";
GRANT ALL ON TABLE "public"."friendship" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."likes_backup" TO "anon";
GRANT ALL ON TABLE "public"."likes_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."likes_backup" TO "service_role";



GRANT ALL ON TABLE "public"."share" TO "anon";
GRANT ALL ON TABLE "public"."share" TO "authenticated";
GRANT ALL ON TABLE "public"."share" TO "service_role";



GRANT ALL ON TABLE "public"."sleep_tracking" TO "anon";
GRANT ALL ON TABLE "public"."sleep_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."sleep_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_status_summary" TO "anon";
GRANT ALL ON TABLE "public"."subscription_status_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_status_summary" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_logs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
