import { Job } from "@boringnode/queue";
import { eq, and, inArray } from "drizzle-orm";
import RSSParser from "rss-parser";
import { podcasts, episodes } from "../../database/schema";
import DownloadAudioJob from "./download-audio";

const parser = new RSSParser();

export interface FeedPollPayload {
  /** If set, poll only this podcast. Otherwise poll all. */
  podcastId?: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default class FeedPollJob extends Job<FeedPollPayload> {
  static options = {
    queue: "default",
    timeout: "10m",
  };

  async execute(): Promise<void> {
    const db = useDB();

    // Get podcasts to poll
    let podcastList;
    if (this.payload.podcastId) {
      podcastList = await db
        .select()
        .from(podcasts)
        .where(eq(podcasts.id, this.payload.podcastId));
    } else {
      podcastList = await db.select().from(podcasts);
    }

    console.log(`[FeedPollJob] Polling ${podcastList.length} podcast(s)`);

    for (const podcast of podcastList) {
      try {
        await this.pollFeed(db, podcast);
      } catch (err) {
        console.error(`[FeedPollJob] Error polling ${podcast.title}:`, err);
        // Continue to next podcast rather than failing the whole job
      }
    }
  }

  private async pollFeed(
    db: ReturnType<typeof useDB>,
    podcast: typeof podcasts.$inferSelect,
  ): Promise<void> {
    const feed = await parser.parseURL(podcast.feedUrl);
    if (!feed.items || feed.items.length === 0) return;

    // Get existing episodes for this podcast
    const existingEpisodes = await db
      .select({
        id: episodes.id,
        guid: episodes.guid,
        enclosureUrl: episodes.enclosureUrl,
        contentLength: episodes.contentLength,
        status: episodes.status,
      })
      .from(episodes)
      .where(eq(episodes.podcastId, podcast.id));

    const existingByGuid = new Map(existingEpisodes.map((e) => [e.guid, e]));

    let newCount = 0;
    let reprocessCount = 0;

    for (const item of feed.items) {
      const guid = item.guid || item.link || item.title;
      if (!guid) continue;

      const enclosureUrl = item.enclosure?.url;
      if (!enclosureUrl) continue; // Skip episodes without audio

      const feedContentLength = item.enclosure?.length
        ? parseInt(String(item.enclosure.length), 10)
        : null;

      const existing = existingByGuid.get(guid);

      if (existing) {
        // Change detection: compare enclosure URL and Content-Length
        const urlChanged = existing.enclosureUrl !== enclosureUrl;
        const lengthChanged =
          feedContentLength !== null &&
          existing.contentLength !== null &&
          existing.contentLength !== feedContentLength;

        if (urlChanged || lengthChanged) {
          // Update episode and re-enqueue for full reprocessing
          await db
            .update(episodes)
            .set({
              enclosureUrl,
              contentLength: feedContentLength,
              status: "pending",
            })
            .where(eq(episodes.id, existing.id));

          await DownloadAudioJob.dispatch({
            episodeId: existing.id,
            enclosureUrl,
          });

          reprocessCount++;
        }
        continue;
      }

      // New episode
      const title = item.title || "Untitled Episode";
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;

      const [episode] = await db
        .insert(episodes)
        .values({
          podcastId: podcast.id,
          title,
          slug,
          guid,
          enclosureUrl,
          contentLength: feedContentLength,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          status: "pending",
        })
        .returning();

      await DownloadAudioJob.dispatch({
        episodeId: episode.id,
        enclosureUrl,
      });

      newCount++;
    }

    if (newCount > 0 || reprocessCount > 0) {
      console.log(
        `[FeedPollJob] ${podcast.title}: ${newCount} new, ${reprocessCount} reprocessed`,
      );
    }
  }
}
