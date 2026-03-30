import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { episodes } from "../../database/schema";
import { resolveEntities } from "../../services/entity-resolution";
import { getQueue } from "../queues";

export interface RawEntity {
  name: string;
  type: "person" | "org" | "place" | "event" | "other";
  mentionCount: number;
  contextSnippets: string[];
}

export interface ResolveEntitiesPayload {
  episodeId: number;
  rawEntities?: RawEntity[];
}

export async function process(job: Job<ResolveEntitiesPayload>): Promise<void> {
  const db = useDB();
  const { episodeId, rawEntities } = job.data;

  if (!rawEntities || rawEntities.length === 0) {
    console.log(
      `[resolve-entities] Episode ${episodeId}: no entities to resolve`,
    );
  } else {
    console.log(
      `[resolve-entities] Episode ${episodeId}: resolving ${rawEntities.length} entities`,
    );
    await resolveEntities(db, episodeId, rawEntities);
    console.log(
      `[resolve-entities] Episode ${episodeId}: entity resolution complete`,
    );
  }

  await getQueue("embed-chunks").add("embed-chunks", { episodeId });
}

export async function failed(
  job: Job<ResolveEntitiesPayload> | undefined,
  error: Error,
): Promise<void> {
  if (!job) return;
  const db = useDB();
  await db
    .update(episodes)
    .set({ status: "failed" })
    .where(eq(episodes.id, job.data.episodeId));
  console.error(
    `[resolve-entities] Episode ${job.data.episodeId} failed:`,
    error.message,
  );
}
