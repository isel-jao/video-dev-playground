import socket from "@/lib/socket";
import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Device } from "mediasoup-client";
import {
  Consumer,
  ConsumerOptions,
  RtpCapabilities,
  Transport,
  TransportOptions,
} from "mediasoup-client/lib/types";
import { Maximize } from "lucide-react";

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
  async function startConsume() {
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
      producerId,
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

  const toggleFullscreen = () => {
    const video = consumerVideoRef.current as HTMLVideoElement;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  return (
    <Card className={twMerge("p-4", className)}>
      <CardTitle>
        Consumer <br /> {producerId}
      </CardTitle>
      <div className="relative w-full group">
        <Button
          variant="ghost"
          className="absolute bottom-2 z-10 right-2 group-hover:opacity-100 opacity-20"
          onClick={toggleFullscreen}
        >
          <Maximize />
        </Button>

        <video
          className="border w-full aspect-video rounded-lg bg-background/50"
          ref={consumerVideoRef}
        ></video>
      </div>
      <div className="flex [&>*]:flex-1 gap-4">
        <Button
          variant="outline"
          onClick={startConsume}
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
  const rtpCapabilitiesRef = useRef<RtpCapabilities | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const [producers, setProducers] = useState<string[]>([]);

  useEffect(() => {
    console.log({
      connected: socket.connected,
    });
    if (socket.connected) {
      socket.emit("getProducers", setProducers);
    }
    socket.on("connect", () => {
      socket.emit("getProducers", setProducers);
    });

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

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setProducers([]);
    });

    return () => {
      socket.off("error");
      socket.off("producerAdded");
      socket.off("producerRemoved");
    };
  }, []);

  return (
    <main className="container flex flex-col p-6 gap-4 ">
      <div className="grid xl:grid-cols-2 gap-6">
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
