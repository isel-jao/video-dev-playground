import { Router } from "mediasoup/node/lib/RouterTypes";
import { webRtcTransportOptions } from "../config/mediasoup";

export const createWebRtcTransport = async (router: Router) => {
  const transport = await router.createWebRtcTransport(webRtcTransportOptions);

  transport.on("dtlsstatechange", (dtlsState) => {
    if (dtlsState === "closed") {
      transport.close();
    }
  });

  transport.on("@close", () => {
    console.log("transport closed");
  });

  return transport;
};
