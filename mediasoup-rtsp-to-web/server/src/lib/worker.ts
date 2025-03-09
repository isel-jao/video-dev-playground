import { createWorker as createMediasoupWorker } from "mediasoup";

export async function createWorker() {
  const worker = await createMediasoupWorker();
  console.log(`mediasoup worker created: ${worker.pid}`);
  worker.on("died", () => {
    console.error("mediasoup worker died");
    setTimeout(() => process.exit(1), 200);
  });
  return worker;
}
