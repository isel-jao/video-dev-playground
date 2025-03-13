import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "./config/env";
import { createWorker } from "./lib/worker";
import { createRouter } from "./lib/router";
import { createWebRtcTransport } from "./lib/webrtcTransport";
import { Producer, Router, Transport } from "mediasoup/node/lib/types";
import { spawn } from "child_process";
import { getFFmpegArgs } from "./config/ffmpegArgs";
import { plainTransportOptions, rtpProducerOptions } from "./config/mediasoup";
import { startFFmpeg } from "./lib/ffmpeg";

const rtspUrls = [
  "rtsp://197.230.172.128:555/user=admin_password=VoX4wnHy_channel=1_stream=0.sdp?real_stream",
  "rtsp://service:Next2899100*@197.230.172.128:553/stream2",
];

const rtpStartPort = 10077;

const producerTransports: Map<string, Transport> = new Map();
const consumerTransports: Map<string, Transport> = new Map();
const producers: Map<string, Producer> = new Map();

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  allowUpgrades: true,
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

async function main() {
  const worker = await createWorker();
  const router = await createRouter(worker);

  for (const [index, rtspUrl] of rtspUrls.entries()) {
    const { producer, producerTransport, error } = await startRtspStream(
      router,
      rtspUrl,
      rtpStartPort + index
    );

    if (error) {
      console.error("Error starting RTSP stream:", error);
    }

    if (producer) {
      producers.set(producer.id, producer);
      producerTransports.set(producer.id, producerTransport);
    }
  }

  httpServer.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });

  io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);

    socket.on("disconnect", () => {
      producerTransports.delete(socket.id);
      consumerTransports.delete(socket.id);
      const producerId = producers.get(socket.id)?.id;
      if (producerId) {
        io.emit("producerRemoved", { id: producerId });
      }
      producers.delete(socket.id);
      console.log("A user disconnected: ", socket.id);
    });

    socket.on("getRtpCapabilities", (res) => res(router.rtpCapabilities));

    socket.on("createRecvTransport", async (res) => {
      try {
        const transport = await createWebRtcTransport(router);
        consumerTransports.set(socket.id, transport);
        res({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });
      } catch (error) {
        console.error("Error creating send transport: ", error);
        res({ error: "Failed to create send transport" });
      }
    });

    socket.on("transport-recv-connect", async ({ dtlsParameters }) => {
      const transport = consumerTransports.get(socket.id);
      if (!transport) {
        throw new Error("Transport not found");
      }
      transport.connect({ dtlsParameters });
    });

    socket.on("consume", async ({ producerId, rtpCapabilities }, res) => {
      try {
        const consumerTransport = consumerTransports.get(socket.id);
        if (!consumerTransport) {
          res({ error: "Consumer transport not found" });
        }
        if (router.canConsume({ producerId, rtpCapabilities })) {
          const consumer = await consumerTransport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
          });

          consumer.on("transportclose", () => {
            console.log("transport close from consumer");
          });

          consumer.on("producerclose", () => {
            console.log("producer of consumer closed");
          });

          const params = {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          };
          res({ params });
        } else {
          res({ error: "Cannot consume" });
        }
      } catch (error) {
        console.log(error.message);
        res({
          error: error.message,
        });
      }
    });

    socket.on("getProducers", (res) => {
      const producerIds = Array.from(producers.values()).map(
        (producer) => producer.id
      );
      res(producerIds);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function startRtspStream(
  router: Router,
  rtspUrl: string,
  rtpPort: number
) {
  try {
    // Create the PlainTransport first with a specific port
    const options = plainTransportOptions;
    options.port = rtpPort;
    const producerTransport = await router.createPlainTransport(options);
    console.log("Producer transport created:", producerTransport.id);

    // Add event listeners for debugging
    producerTransport.on("tuple", (tuple) => {
      console.log("Transport tuple:", tuple);
    });

    producerTransport.on("rtcptuple", (tuple) => {
      console.log("Transport RTCP tuple:", tuple);
    });

    // Create the producer with the correct RTP parameters
    const producer = await producerTransport.produce(rtpProducerOptions);
    console.log("Producer created with ID:", producer.id);

    // Add event listeners for debugging
    producer.on("score", (score) => {
      console.log("Producer score:", score);
    });

    producer.on("transportclose", () => {
      console.log("Producer transport closed");
    });

    // Start FFmpeg after creating the producer
    const ffmpeg = startFFmpeg(rtspUrl, rtpPort);

    return { producer, producerTransport, error: null };
  } catch (error) {
    console.error("Error starting RTSP stream:", error);
    return { producer: null, producerTransport: null, error };
  }
}
