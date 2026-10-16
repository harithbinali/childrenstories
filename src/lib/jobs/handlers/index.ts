import type { JobHandler, JobType } from "../types";
import { characterGenerate, sceneTest } from "./character";
import { storyGenerate, storyRewritePage } from "./story";
import { coverIllustration, pageIllustration } from "./illustration";
import { bookProduction, pdfRender, purgeExpiredPhotos } from "./production";
import { sendEmail } from "./email";

export const handlers: Record<JobType, JobHandler> = {
  character_generate: characterGenerate,
  scene_test: sceneTest,
  story_generate: storyGenerate,
  story_rewrite_page: storyRewritePage,
  page_illustration: pageIllustration,
  cover_illustration: coverIllustration,
  book_production: bookProduction,
  pdf_render: pdfRender,
  purge_expired_photos: purgeExpiredPhotos,
  send_email: sendEmail,
};
