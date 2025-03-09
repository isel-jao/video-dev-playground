import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "./config/env";
import { createWorker } from "./lib/worker";
import { createRouter } from "./lib/router";
import { createWebRtcTransport } from "./lib/webrtcTransport";
import {
  DtlsParameters,
  Producer,
  Router,
  Transport,
} from "mediasoup/node/lib/types";
import { spawn } from "child_process";

const rtspUrl =
  process.env.RTSP_URL ||
  "rtsp://service:Next2899100*@197.230.172.128:553/stream2";

const rtpPort = 10077;

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

  const { producer, producerTransport, error } = await startRtspStream(router);
  if (error) {
    console.error("Error starting RTSP stream:", error);
    process.exit(1);
  }

  if (producer) {
    producers.set(producer.id, producer);
    producerTransports.set(producer.id, producerTransport);
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

    socket.on("createSendTransport", async (res) => {
      try {
        const transport = await createWebRtcTransport(router);
        producerTransports.set(socket.id, transport);
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

    socket.on(
      "transport-connect",
      async ({ dtlsParameters }: { dtlsParameters: DtlsParameters }) => {
        const transport = producerTransports.get(socket.id);
        if (!transport) {
          console.error("Transport not found");
        }
        transport.connect({ dtlsParameters });
      }
    );

    socket.on(
      "transport-produce",
      async ({ kind, rtpParameters }, callback) => {
        try {
          const transport = producerTransports.get(socket.id);
          if (!transport) {
            throw new Error("Transport not found");
          }
          const producer = await transport.produce({ kind, rtpParameters });
          producers.set(socket.id, producer);
          // send the producer to everyone else
          io.emit("producerAdded", { id: producer.id });
          callback({ id: producer.id });
        } catch (error) {
          console.error(error);
          callback({ error: "Failed to produce" });
        }
      }
    );

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

async function startRtspStream(router: Router) {
  try {
    // Create the PlainTransport first with a specific port
    const producerTransport = await router.createPlainTransport({
      listenIp: { ip: "0.0.0.0", announcedIp: "127.0.0.1" },
      rtcpMux: true,
      comedia: true,
      port: rtpPort,
    });
    console.log("Producer transport created:", producerTransport.id);

    // Add event listeners for debugging
    producerTransport.on("tuple", (tuple) => {
      console.log("Transport tuple:", tuple);
    });

    producerTransport.on("rtcptuple", (tuple) => {
      console.log("Transport RTCP tuple:", tuple);
    });

    // Create the producer with the correct RTP parameters
    const producer = await producerTransport.produce({
      kind: "video",
      rtpParameters: {
        codecs: [
          {
            mimeType: "video/h264",
            clockRate: 90000,
            payloadType: 101,
            parameters: {
              "packetization-mode": 1,
              "profile-level-id": "42e01f",
              "level-asymmetry-allowed": 1,
            },
            rtcpFeedback: [
              { type: "nack" },
              { type: "nack", parameter: "pli" },
              { type: "ccm", parameter: "fir" },
            ],
          },
        ],
        encodings: [{ ssrc: 1111 }],
      },
    });
    console.log("Producer created with ID:", producer.id);

    // Add event listeners for debugging
    producer.on("score", (score) => {
      console.log("Producer score:", score);
    });

    producer.on("transportclose", () => {
      console.log("Producer transport closed");
    });

    // Start FFmpeg after creating the producer
    const ffmpeg = startFFmpeg();

    return { producer, producerTransport, error: null };
  } catch (error) {
    console.error("Error starting RTSP stream:", error);
    return { producer: null, producerTransport: null, error };
  }
}

function startFFmpeg() {
  console.log(`Starting ffmpeg to capture RTSP stream from ${rtspUrl}`);
  console.log(`Output RTP stream to port: ${rtpPort}`);

  const rtpUrl = `rtp://127.0.0.1:${rtpPort}`;
  const ffmpegArgs = [
    "-rtsp_transport",
    "tcp",
    "-i",
    rtspUrl,
    "-an", // No audio
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-color_range",
    "tv", // Explicitly set color range to fix warning
    "-profile:v",
    "baseline",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-x264-params",
    "keyint=60:min-keyint=60",
    "-b:v",
    "2M",
    "-maxrate",
    "2M", // Add maxrate to fix VBV warning
    "-bufsize",
    "2M",
    "-f",
    "rtp",
    "-payload_type",
    "101",
    "-ssrc",
    "1111",
    rtpUrl,
  ];
  console.log("FFmpeg command:", "ffmpeg", ffmpegArgs.join(" "));
  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log(`FFmpeg stderr: ${data.toString()}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (code !== 0) {
      console.log("Attempting to reconnect...");
      setTimeout(startFFmpeg, 5000);
    }
  });

  return ffmpeg;
}
