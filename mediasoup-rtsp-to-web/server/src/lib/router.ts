import { Worker } from "mediasoup/node/lib/types";
import { mediaCodecs } from "../config/mediasoup";

export async function createRouter(worker: Worker) {
  const router = await worker.createRouter({
    mediaCodecs,
  });
  console.log("router created: ", router.id);
  return router;
}
