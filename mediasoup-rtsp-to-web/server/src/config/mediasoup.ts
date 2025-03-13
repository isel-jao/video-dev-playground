import {
  PlainTransportOptions,
  ProducerOptions,
  RtpCodecCapability,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";
import { env } from "./env";

export const webRtcTransportOptions: WebRtcTransportOptions = {
  listenIps: [{ ip: env.ip, announcedIp: env.announcedIp }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};

export const plainTransportOptions: PlainTransportOptions = {
  listenIp: { ip: env.ip, announcedIp: env.announcedIp },
  rtcpMux: true,
  comedia: true,
};

export const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: "video",
    mimeType: "video/h264",
    clockRate: 90000,
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
];

export const rtpProducerOptions: ProducerOptions = {
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
};
