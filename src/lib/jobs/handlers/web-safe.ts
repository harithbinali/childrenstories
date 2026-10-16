import type { JobHandler, JobType } from "../types";
import { characterGenerate, sceneTest } from "./character";
import { storyGenerate, storyRewritePage } from "./story";
import { coverIllustration, pageIllustration } from "./illustration";
import { bookProduction, purgeExpiredPhotos } from "./production";
import { sendEmail } from "./email";

/** Handlers that can run inside a Next.js route (no Chromium / react-dom/server). */
export const webSafeHandlers: Record<Exclude<JobType, "pdf_render">, JobHandler> = {
  character_generate: characterGenerate,
  scene_test: sceneTest,
  story_generate: storyGenerate,
  story_rewrite_page: storyRewritePage,
  page_illustration: pageIllustration,
  cover_illustration: coverIllustration,
  book_production: bookProduction,
  purge_expired_photos: purgeExpiredPhotos,
  send_email: sendEmail,
};
