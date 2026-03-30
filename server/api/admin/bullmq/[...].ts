import type { H3Event } from "h3";

import { H3Adapter } from "@bull-board/h3";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { createBullBoard } from "@bull-board/api";
import { initQueues } from "~~/server/queue/queues";

const serverAdapter = new H3Adapter();
serverAdapter.setBasePath("/api/admin/bullmq");

const queues = initQueues();

createBullBoard({
  queues: Array.from(queues.values()).map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

const uiHandler = serverAdapter.registerHandlers();

export const redirectToBullboard = async (event: H3Event) => {
  return await uiHandler.handler(event);
};

export default defineEventHandler(redirectToBullboard);
