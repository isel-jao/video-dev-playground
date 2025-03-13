export const getFFmpegArgs = ({
  rtpUrl,
  rtspUrl,
}: {
  rtspUrl: string;
  rtpUrl: string;
}) => {
  const ffmpegArgs = [
    // "-rtsp_transport": Selects the RTSP transport protocol; options include "tcp" (chosen) or "udp".
    "-rtsp_transport",
    "tcp",
    // "-i": Specifies the input stream/file; supports various URL schemes.
    "-i",
    rtspUrl,
    // "-an": Disables audio processing.
    "-an",
    // "-c:v": Sets the video codec; "libx264" is used, alternatives could be "mpeg4", "libvpx", etc.
    "-c:v",
    "libx264",
    // "-pix_fmt": Defines the pixel format; "yuv420p" is widely compatible. Alternatives include "nv12".
    "-pix_fmt",
    "yuv420p",
    // "-color_range": Defines color range; "tv" for limited range, or "pc" for full range.
    "-color_range",
    "tv",
    // "-profile:v": Selects the H264 profile; "baseline" is chosen for broad compatibility. Options: "main", "high".
    "-profile:v",
    "baseline",
    // "-preset": Sets encoding speed/quality trade-off; "ultrafast" minimizes latency. Alternatives: "superfast", "medium", etc.
    "-preset",
    "ultrafast",
    // "-tune": Tunes encoder settings for specific scenarios; "zerolatency" optimizes for streaming.
    "-tune",
    "zerolatency",
    // "-x264-params": Provides custom parameters to libx264; here setting keyframe interval (in frames).
    "-x264-params",
    "keyint=60:min-keyint=60",
    // "-b:v": Specifies the target video bitrate; "2M" stands for 2 Mbps, adjust as needed.
    "-b:v",
    "1M",
    // "-maxrate": Sets the maximum video bitrate to control bitrate spikes.
    "-maxrate",
    "2M",
    // "-bufsize": Sets the rate control buffer size, affecting bitrate variability.
    "-bufsize",
    "2M",
    // "-f": Forces the output format; here it's set to "rtp".
    "-f",
    "rtp",
    // "-payload_type": Sets the RTP payload type; adjust based on stream requirements.
    "-payload_type",
    "101",
    // "-ssrc": Sets the RTP synchronization source identifier; a unique constant used for RTP streams.
    "-ssrc",
    "1111",
    // rtpUrl: Specifies the output RTP URL.
    rtpUrl,
  ];

  return ffmpegArgs;
};
