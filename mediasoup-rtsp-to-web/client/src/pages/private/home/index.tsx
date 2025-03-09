import socket from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Device } from "mediasoup-client";
import {
  Consumer,
  ConsumerOptions,
  ProducerOptions,
  RtpCapabilities,
  Transport,
  TransportOptions,
} from "mediasoup-client/lib/types";

const mediaStreamConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    width: {
      min: 640,
      max: 1920,
    },
    height: {
      min: 400,
      max: 1080,
    },
  },
};

const params: ProducerOptions = {
  encodings: [
    {
      rid: "r0",
      maxBitrate: 100000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r1",
      maxBitrate: 300000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r2",
      maxBitrate: 900000,
      scalabilityMode: "S1T3",
    },
  ],
  codecOptions: {
    videoGoogleStartBitrate: 1000,
  },
};

async function getLocalStream() {
  const stream = await navigator.mediaDevices.getUserMedia(
    mediaStreamConstraints
  );

  return stream;
}

async function getRtpCapabilities() {
  return new Promise<RtpCapabilities>((resolve) => {
    socket.emit("getRtpCapabilities", (rtpCapabilities: RtpCapabilities) => {
      resolve(rtpCapabilities);
    });
  });
}

async function createDevice(
  rtpCapabilities: RtpCapabilities
): Promise<Device | null> {
  try {
    const device = new Device();

    await device.load({
      routerRtpCapabilities: rtpCapabilities,
    });

    console.log("Device created", device);
    return device;
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.name === "UnsupportedError")
      console.warn("browser not supported");
    console.error("Error creating device: ", error);
    return null;
  }
}

async function createSendTransport(device: Device) {
  return new Promise<Transport>((resolve) => {
    socket.emit(
      "createSendTransport",
      async (data: { params: TransportOptions }) => {
        const producerTransport = device.createSendTransport(data.params);

        producerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit("transport-connect", {
                dtlsParameters,
              });
              callback();
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        // Add produce event handler
        producerTransport.on(
          "produce",
          async ({ kind, rtpParameters }, callback, errback) => {
            try {
              socket.emit(
                "transport-produce",
                {
                  kind,
                  rtpParameters,
                },
                ({ id }: { id: string }) => callback({ id })
              );
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        resolve(producerTransport);
      }
    );
  });
}

async function createRecvTransport(device: Device) {
  return new Promise<Transport>((resolve) => {
    socket.emit("createRecvTransport", (data: { params: TransportOptions }) => {
      const recvTransport = device.createRecvTransport(data.params);
      recvTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit("transport-recv-connect", { dtlsParameters });
            callback();
          } catch (error) {
            errback(error as Error);
          }
        }
      );
      resolve(recvTransport);
    });
  });
}

async function connectSendTransport(
  producerTransport: Transport,
  params: ProducerOptions
) {
  const producer = await producerTransport.produce(params);
  producer.on("trackended", () => {
    console.log("track ended");
  });
  producer.on("transportclose", () => {
    console.log("transport ended");
  });
  return producer;
}

async function connectRecvTransport(
  producerId: string,
  recvTransport: Transport,
  device: Device
) {
  return new Promise<Consumer>((resolve) => {
    socket.emit(
      "consume",
      {
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      },
      async ({ params, error }: { params: ConsumerOptions; error: string }) => {
        if (error) {
          console.error("Error consuming: ", error);
          return;
        }
        if (!params) {
          console.log("Cannot Consume - no params received");
          return;
        }
        console.log("consume params", params);

        const consumer = await recvTransport.consume(params);
        resolve(consumer);
      }
    );
  });
}

import React from "react";
import { twMerge } from "tailwind-merge";

interface ConsumerProps {
  className?: string;
  producerId: string;
  deviceRef: React.RefObject<Device | null>;
  rtpCapabilitiesRef: React.RefObject<RtpCapabilities | null>;
}

function ConsumerCard({
  className,
  producerId,
  rtpCapabilitiesRef,
  deviceRef,
}: ConsumerProps) {
  const consumerVideoRef = useRef<HTMLVideoElement>(null);

  async function startConsume(id: string) {
    if (!consumerVideoRef.current) {
      console.error("Consumer video ref is not connected");
      return;
    }
    if (!rtpCapabilitiesRef.current) {
      // get rtpCapabilities from server
      rtpCapabilitiesRef.current = await getRtpCapabilities();
    }
    if (!deviceRef.current) {
      deviceRef.current = await createDevice(rtpCapabilitiesRef.current);
      if (!deviceRef.current) {
        console.error("Failed to create device");
        return;
      }
    }
    const recvTransport = await createRecvTransport(deviceRef.current);
    console.log("recvTransport", recvTransport);

    const consumer = await connectRecvTransport(
      id,
      recvTransport,
      deviceRef.current
    );
    console.log("consumer", consumer);

    const { track } = consumer;
    if (!track) {
      console.error("No track received");
      return;
    }
    consumerVideoRef.current.srcObject = new MediaStream([track]);
    consumerVideoRef.current.play();
  }

  async function stopConsume() {}
  return (
    <Card className={twMerge("p-4", className)}>
      <CardTitle>
        Consumer <br /> {producerId}
      </CardTitle>
      <video
        className="border w-full aspect-video rounded-lg bg-background/50"
        ref={consumerVideoRef}
      ></video>
      <div className="flex [&>*]:flex-1 gap-4">
        <Button
          variant="outline"
          onClick={() => startConsume(producerId)}
          // disabled={!producerVideoRef.current}
        >
          Start Consume
        </Button>
        <Button variant="outline" onClick={stopConsume}>
          Stop Consume
        </Button>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const producerVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rtpCapabilitiesRef = useRef<RtpCapabilities | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const [producers, setProducers] = useState<string[]>([]);

  useEffect(() => {
    async function getProducers() {
      if (socket.connected) {
        socket.emit("getProducers", setProducers);
      } else {
        socket.once("connect", () => {
          socket.emit("getProducers", setProducers);
        });
      }
    }

    socket.on("error", (error) => {
      console.error("Error connecting to server: ", error);
    });

    socket.on("producerAdded", ({ id }: { id: string }) => {
      console.log("New producer: ", id);
      setProducers((prev) => [...prev, id]);
    });

    socket.on("producerRemoved", ({ id }: { id: string }) => {
      console.log("Producer removed: ", id);
      setProducers((prev) => prev.filter((p) => p !== id));
    });

    getProducers();

    return () => {
      socket.off("error");
      socket.off("producerAdded");
      socket.off("producerRemoved");
    };
  }, []);

  async function startProduce() {
    try {
      // check if socket is connected
      if (!socket.connected) {
        console.error("Socket is not connected");
        return;
      }
      if (!producerVideoRef.current) {
        console.error("Producer video ref is not connected");
        return;
      }
      // get local stream
      localStreamRef.current = await getLocalStream();
      producerVideoRef.current.srcObject = localStreamRef.current;
      producerVideoRef.current.play();

      // get rtpCapabilities from server
      if (!rtpCapabilitiesRef.current) {
        // get rtpCapabilities from server
        rtpCapabilitiesRef.current = await getRtpCapabilities();
      }
      console.log("rtpCapabilities", rtpCapabilitiesRef.current);
      if (!deviceRef.current) {
        deviceRef.current = await createDevice(rtpCapabilitiesRef.current);
        if (!deviceRef.current) {
          console.error("Failed to create device");
          return;
        }
      }
      // create sentTransport
      const sendTransport = await createSendTransport(deviceRef.current);
      console.log("sendTransport", sendTransport);

      const producer = await connectSendTransport(sendTransport, {
        track: localStreamRef.current?.getTracks()[0],
        ...params,
      });
      console.log("producer", producer);
    } catch (error) {
      console.error("Error starting produce: ", error);
    }
  }

  async function stopProduce() {
    // check if socket is connected
    if (!socket.connected) {
      console.error("Socket is not connected");
      return;
    }
    // stop local stream
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }

  return (
    <main className="container flex flex-col p-6 gap-4">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="p-4">
          <CardTitle>Producer</CardTitle>
          <video
            className="border w-full aspect-video rounded-lg bg-background/50"
            ref={producerVideoRef}
          ></video>
          <div className="flex [&>*]:flex-1 gap-4">
            <Button variant="outline" onClick={startProduce}>
              Start Produce
            </Button>
            <Button variant="outline" onClick={stopProduce}>
              Stop Produce
            </Button>
          </div>
        </Card>
        {producers.map((id) => (
          <ConsumerCard
            key={id}
            producerId={id}
            deviceRef={deviceRef}
            rtpCapabilitiesRef={rtpCapabilitiesRef}
          />
        ))}
      </div>
    </main>
  );
}
