import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  varchar,
  real,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Podcasts ──────────────────────────────────────────────

export const podcasts = pgTable(
  "podcasts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    feedUrl: text("feed_url").notNull().unique(),
    appleId: varchar("apple_id", { length: 50 }),
    podcastIndexId: varchar("podcast_index_id", { length: 50 }),
    artworkUrl: text("artwork_url"),
    description: text("description"),
    language: varchar("language", { length: 10 }).default("es"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("podcasts_feed_url_idx").on(table.feedUrl)],
);

export const podcastsRelations = relations(podcasts, ({ many }) => ({
  episodes: many(episodes),
}));

// ── Episodes ──────────────────────────────────────────────

export const episodes = pgTable(
  "episodes",
  {
    id: serial("id").primaryKey(),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    guid: text("guid").notNull(),
    audioUrl: text("audio_url"),
    audioStorageKey: text("audio_storage_key"),
    durationSeconds: integer("duration_seconds"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    enclosureUrl: text("enclosure_url"),
    contentLength: integer("content_length"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("episodes_guid_podcast_idx").on(table.podcastId, table.guid),
    index("episodes_podcast_id_idx").on(table.podcastId),
    index("episodes_status_idx").on(table.status),
  ],
);

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  podcast: one(podcasts, {
    fields: [episodes.podcastId],
    references: [podcasts.id],
  }),
  transcript: one(transcripts),
  summary: one(episodeSummaries),
  episodeTopics: many(episodeTopics),
  episodeEntities: many(episodeEntities),
}));

// ── Transcripts ───────────────────────────────────────────

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodes.id)
    .unique(),
  rawText: text("raw_text"),
  cleanText: text("clean_text"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  episode: one(episodes, {
    fields: [transcripts.episodeId],
    references: [episodes.id],
  }),
  chunks: many(transcriptChunks),
}));

// ── Transcript Chunks ─────────────────────────────────────

export const transcriptChunks = pgTable(
  "transcript_chunks",
  {
    id: serial("id").primaryKey(),
    transcriptId: integer("transcript_id")
      .notNull()
      .references(() => transcripts.id),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodes.id),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
  },
  (table) => [
    index("transcript_chunks_transcript_id_idx").on(table.transcriptId),
    index("transcript_chunks_episode_id_idx").on(table.episodeId),
  ],
);

export const transcriptChunksRelations = relations(
  transcriptChunks,
  ({ one }) => ({
    transcript: one(transcripts, {
      fields: [transcriptChunks.transcriptId],
      references: [transcripts.id],
    }),
    episode: one(episodes, {
      fields: [transcriptChunks.episodeId],
      references: [episodes.id],
    }),
  }),
);

// ── Topics ────────────────────────────────────────────────

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  embedding: vector("embedding", { dimensions: 768 }),
  episodeCount: integer("episode_count").default(0).notNull(),
});

export const topicsRelations = relations(topics, ({ many }) => ({
  episodeTopics: many(episodeTopics),
}));

// ── Entities ──────────────────────────────────────────────

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(), // person, org, place, event, other
  aliases: text("aliases").array(),
  description: text("description"),
  embedding: vector("embedding", { dimensions: 768 }),
  mentionCount: integer("mention_count").default(0).notNull(),
});

export const entitiesRelations = relations(entities, ({ many }) => ({
  episodeEntities: many(episodeEntities),
}));

// ── Episode Topics (junction) ─────────────────────────────

export const episodeTopics = pgTable(
  "episode_topics",
  {
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodes.id),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topics.id),
    relevanceScore: real("relevance_score"),
  },
  (table) => [primaryKey({ columns: [table.episodeId, table.topicId] })],
);

export const episodeTopicsRelations = relations(episodeTopics, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodeTopics.episodeId],
    references: [episodes.id],
  }),
  topic: one(topics, {
    fields: [episodeTopics.topicId],
    references: [topics.id],
  }),
}));

// ── Episode Entities (junction) ───────────────────────────

export const episodeEntities = pgTable(
  "episode_entities",
  {
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodes.id),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entities.id),
    mentionCount: integer("mention_count").default(0),
    contextSnippets: jsonb("context_snippets"), // string[]
  },
  (table) => [primaryKey({ columns: [table.episodeId, table.entityId] })],
);

export const episodeEntitiesRelations = relations(
  episodeEntities,
  ({ one }) => ({
    episode: one(episodes, {
      fields: [episodeEntities.episodeId],
      references: [episodes.id],
    }),
    entity: one(entities, {
      fields: [episodeEntities.entityId],
      references: [entities.id],
    }),
  }),
);

// ── Episode Summaries ─────────────────────────────────────

export const episodeSummaries = pgTable(
  "episode_summaries",
  {
    id: serial("id").primaryKey(),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => episodes.id)
      .unique(),
    summaryText: text("summary_text").notNull(),
    keyPoints: jsonb("key_points"), // string[]
  },
  (table) => [
    uniqueIndex("episode_summaries_episode_id_idx").on(table.episodeId),
  ],
);

export const episodeSummariesRelations = relations(
  episodeSummaries,
  ({ one }) => ({
    episode: one(episodes, {
      fields: [episodeSummaries.episodeId],
      references: [episodes.id],
    }),
  }),
);

// ── Answer Cache ──────────────────────────────────────────

export const answerCache = pgTable("answer_cache", {
  id: serial("id").primaryKey(),
  queryText: text("query_text").notNull(),
  queryEmbedding: vector("query_embedding", { dimensions: 768 }),
  answerText: text("answer_text").notNull(),
  sourceEpisodeIds: integer("source_episode_ids").array(),
  topicIds: integer("topic_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
