import {
  RtpCodecCapability,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";

export const webRtcTransportOptions: WebRtcTransportOptions = {
  listenIps: [
    {
      ip: "0.0.0.0",
      announcedIp: "127.0.0.1",
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};

export const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
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
