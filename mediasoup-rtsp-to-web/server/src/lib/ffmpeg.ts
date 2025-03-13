import { spawn } from "node:child_process";
import { getFFmpegArgs } from "../config/ffmpegArgs";
import { env } from "../config/env";

export function startFFmpeg(rtspUrl: string, rtpPort: number) {
  console.log(`Starting ffmpeg to capture RTSP stream from ${rtspUrl}`);
  console.log(`Output RTP stream to port: ${rtpPort}`);

  // const rtpUrl = `rtp://127.0.0.1:${rtpPort}`;
  const rtpUrl = `rtp://${env.ip}:${rtpPort}`;
  const ffmpegArgs = getFFmpegArgs({ rtpUrl, rtspUrl });
  console.log("FFmpeg command:", "ffmpeg", ffmpegArgs.join(" "));
  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  // ffmpeg.stderr.on("data", (data) => {
  //   console.log(`FFmpeg stderr: ${data.toString()}`);
  // });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (code !== 0) {
      console.log("Attempting to reconnect...");
      setTimeout(() => {
        startFFmpeg(rtspUrl, rtpPort);
      }, 5000);
    }
  });

  return ffmpeg;
}
