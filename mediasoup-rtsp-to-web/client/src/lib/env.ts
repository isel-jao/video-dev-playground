import { z } from "zod";

const envSchema = z.object({
  VITE_NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VITE_DATABASE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(import.meta.env);
