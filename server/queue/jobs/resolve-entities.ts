import { Job } from "@boringnode/queue";
import { eq } from "drizzle-orm";
import { episodes } from "../../database/schema";
import { resolveEntities } from "../../services/entity-resolution";
import EmbedChunksJob from "./embed-chunks";

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

export default class ResolveEntitiesJob extends Job<ResolveEntitiesPayload> {
  static options = {
    queue: "default",
    timeout: "10m",
  };

  async execute(): Promise<void> {
    const db = useDB();
    const { episodeId, rawEntities } = this.payload;

    if (!rawEntities || rawEntities.length === 0) {
      console.log(
        `[ResolveEntitiesJob] Episode ${episodeId}: no entities to resolve`,
      );
    } else {
      console.log(
        `[ResolveEntitiesJob] Episode ${episodeId}: resolving ${rawEntities.length} entities`,
      );
      await resolveEntities(db, episodeId, rawEntities);
      console.log(
        `[ResolveEntitiesJob] Episode ${episodeId}: entity resolution complete`,
      );
    }

    // Chain: resolve-entities → embed-chunks
    await EmbedChunksJob.dispatch({
      episodeId,
    });
  }

  async failed(error: Error): Promise<void> {
    const db = useDB();
    await db
      .update(episodes)
      .set({ status: "failed" })
      .where(eq(episodes.id, this.payload.episodeId));

    console.error(
      `[ResolveEntitiesJob] Episode ${this.payload.episodeId} failed:`,
      error.message,
    );
  }
}
