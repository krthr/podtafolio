import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import RSSParser from "rss-parser";
import { podcasts, episodes } from "../../database/schema";
import { getQueue } from "../queues";

const parser = new RSSParser();

export interface FeedPollPayload {
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

export async function process(job: Job<FeedPollPayload>): Promise<void> {
  const db = useDB();

  let podcastList;
  if (job.data.podcastId) {
    podcastList = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, job.data.podcastId));
  } else {
    podcastList = await db.select().from(podcasts);
  }

  console.log(`[feed-poll] Polling ${podcastList.length} podcast(s)`);

  for (const podcast of podcastList) {
    try {
      await pollFeed(db, podcast);
    } catch (err) {
      console.error(`[feed-poll] Error polling ${podcast.title}:`, err);
    }
  }
}

async function pollFeed(
  db: ReturnType<typeof useDB>,
  podcast: typeof podcasts.$inferSelect,
): Promise<void> {
  const feed = await parser.parseURL(podcast.feedUrl);
  if (!feed.items || feed.items.length === 0) return;

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
  const downloadQueue = getQueue("download");

  let newCount = 0;
  let reprocessCount = 0;

  for (const item of feed.items) {
    const guid = item.guid || item.link || item.title;
    if (!guid) continue;

    const enclosureUrl = item.enclosure?.url;
    if (!enclosureUrl) continue;

    const feedContentLength = item.enclosure?.length
      ? parseInt(String(item.enclosure.length), 10)
      : null;

    const existing = existingByGuid.get(guid);

    if (existing) {
      const urlChanged = existing.enclosureUrl !== enclosureUrl;
      const lengthChanged =
        feedContentLength !== null &&
        existing.contentLength !== null &&
        existing.contentLength !== feedContentLength;

      if (urlChanged || lengthChanged) {
        await db
          .update(episodes)
          .set({
            enclosureUrl,
            contentLength: feedContentLength,
            status: "pending",
          })
          .where(eq(episodes.id, existing.id));

        await downloadQueue.add("download", {
          episodeId: existing.id,
          enclosureUrl,
        });

        reprocessCount++;
      }
      continue;
    }

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

    await downloadQueue.add("download", {
      episodeId: episode!.id,
      enclosureUrl,
    });

    newCount++;
  }

  if (newCount > 0 || reprocessCount > 0) {
    console.log(
      `[feed-poll] ${podcast.title}: ${newCount} new, ${reprocessCount} reprocessed`,
    );
  }
}
