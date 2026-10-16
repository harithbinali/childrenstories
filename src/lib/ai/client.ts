import "@/lib/server-guard";
import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;

/** Server-side OpenAI client. Retries are handled by runAI, so the SDK's are disabled. */
export function openai(): OpenAI {
  client ??= new OpenAI({
    apiKey: env("OPENAI_API_KEY"),
    organization: process.env.OPENAI_ORG_ID || undefined,
    project: process.env.OPENAI_PROJECT_ID || undefined,
    maxRetries: 0,
  });
  return client;
}
