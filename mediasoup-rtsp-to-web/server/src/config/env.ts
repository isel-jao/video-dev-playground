import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default("3000"),
  NODE_ENV: z.string().default("development"),
  // ip: z.string().default("192.168.11.103"),
  ip: z.string().default("0.0.0.0"),
  // announcedIp: z.string().default("192.168.11.103"),
  announcedIp: z.string().default("127.0.0.1"),
});

export const env = envSchema.parse(process.env);
