export const getFFmpegArgs = ({
  rtpUrl,
  rtspUrl,
}: {
  rtspUrl: string;
  rtpUrl: string;
}) => {
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

  return ffmpegArgs;
};
