import { QueueManager } from "@boringnode/queue";
import { eq } from "drizzle-orm";
import { episodes } from "../../../database/schema";
import FeedPollJob from "../../../queue/jobs/feed-poll";
import DownloadAudioJob from "../../../queue/jobs/download-audio";
import TranscribeJob from "../../../queue/jobs/transcribe";
import AnalyzeJob from "../../../queue/jobs/analyze";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const action = body?.action;

  if (action === "retry") {
    const { jobId, queue } = body;
    if (!jobId || !queue) {
      throw createError({
        statusCode: 400,
        data: { error: "Missing jobId or queue" },
      });
    }

    const adapter = QueueManager.use();
    const job = await adapter.getJob(jobId, queue);
    if (!job) {
      throw createError({ statusCode: 404, data: { error: "Job not found" } });
    }
    if (job.status !== "failed") {
      throw createError({
        statusCode: 400,
        data: { error: "Job is not in failed state" },
      });
    }

    await adapter.retryJob(jobId, queue);
    return { ok: true, message: "Job retried" };
  }

  if (action === "poll-feeds") {
    const { jobId } = await FeedPollJob.dispatch({});
    return { ok: true, jobId, message: "Feed poll dispatched" };
  }

  if (action === "reprocess") {
    const { episodeId, startFrom } = body;
    if (!episodeId || !startFrom) {
      throw createError({
        statusCode: 400,
        data: { error: "Missing episodeId or startFrom" },
      });
    }

    const validStages = ["download", "transcribe", "analyze"];
    if (!validStages.includes(startFrom)) {
      throw createError({
        statusCode: 400,
        data: { error: "Invalid startFrom stage" },
      });
    }

    const db = useDB();
    const [episode] = await db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (!episode) {
      throw createError({
        statusCode: 404,
        data: { error: "Episode not found" },
      });
    }

    let jobId: string;

    if (startFrom === "download") {
      ({ jobId } = await DownloadAudioJob.dispatch({
        episodeId: episode.id,
        enclosureUrl: episode.enclosureUrl!,
      }));
    } else if (startFrom === "transcribe") {
      ({ jobId } = await TranscribeJob.dispatch({ episodeId: episode.id }));
    } else {
      ({ jobId } = await AnalyzeJob.dispatch({ episodeId: episode.id }));
    }

    return { ok: true, jobId, message: `Reprocessing from ${startFrom}` };
  }

  throw createError({ statusCode: 400, data: { error: "Unknown action" } });
});
