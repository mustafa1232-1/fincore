import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  REFRESH_SECRET: z.string().min(16, "REFRESH_SECRET must be at least 16 chars"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("fincore-files"),
  CORS_ORIGIN: z.string().default("*")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Keep the message explicit for infra debugging in production logs.
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
