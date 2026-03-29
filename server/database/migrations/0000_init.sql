CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "answer_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_text" text NOT NULL,
	"query_embedding" vector(768),
	"answer_text" text NOT NULL,
	"source_episode_ids" integer[],
	"topic_ids" integer[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"aliases" text[],
	"description" text,
	"embedding" vector(768),
	"mention_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "episode_entities" (
	"episode_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"mention_count" integer DEFAULT 0,
	"context_snippets" jsonb,
	CONSTRAINT "episode_entities_episode_id_entity_id_pk" PRIMARY KEY("episode_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "episode_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"summary_text" text NOT NULL,
	"key_points" jsonb,
	CONSTRAINT "episode_summaries_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
CREATE TABLE "episode_topics" (
	"episode_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"relevance_score" real,
	CONSTRAINT "episode_topics_episode_id_topic_id_pk" PRIMARY KEY("episode_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"podcast_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"guid" text NOT NULL,
	"audio_url" text,
	"audio_storage_key" text,
	"duration_seconds" integer,
	"published_at" timestamp with time zone,
	"enclosure_url" text,
	"content_length" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "podcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"feed_url" text NOT NULL,
	"apple_id" varchar(50),
	"podcast_index_id" varchar(50),
	"artwork_url" text,
	"description" text,
	"language" varchar(10) DEFAULT 'es',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "podcasts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "podcasts_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"embedding" vector(768),
	"episode_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transcript_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"transcript_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768),
	"start_offset" integer,
	"end_offset" integer
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"raw_text" text,
	"clean_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transcripts_episode_id_unique" UNIQUE("episode_id")
);
--> statement-breakpoint
ALTER TABLE "episode_entities" ADD CONSTRAINT "episode_entities_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_entities" ADD CONSTRAINT "episode_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_summaries" ADD CONSTRAINT "episode_summaries_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_topics" ADD CONSTRAINT "episode_topics_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_topics" ADD CONSTRAINT "episode_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "public"."podcasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episode_summaries_episode_id_idx" ON "episode_summaries" USING btree ("episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_guid_podcast_idx" ON "episodes" USING btree ("podcast_id","guid");--> statement-breakpoint
CREATE INDEX "episodes_podcast_id_idx" ON "episodes" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX "episodes_status_idx" ON "episodes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "podcasts_feed_url_idx" ON "podcasts" USING btree ("feed_url");--> statement-breakpoint
CREATE INDEX "transcript_chunks_transcript_id_idx" ON "transcript_chunks" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX "transcript_chunks_episode_id_idx" ON "transcript_chunks" USING btree ("episode_id");