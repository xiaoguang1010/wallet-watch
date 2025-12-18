import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  PORT: z.string().default("3000"),
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  // Passkey (RP Info)
  RP_ID: z.string().default("localhost"),
  RP_NAME: z.string().default("Wallet Watch"),
  RP_ORIGIN: z.string().url().default("http://localhost:3000"),
  // Auth
  SESSION_SECRET: z.string().min(32).default("super-secret-session-key-change-me"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
