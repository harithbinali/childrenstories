import type { JobHandler, JobType } from "../types";
import { webSafeHandlers } from "./web-safe";
import { pdfRender } from "./pdf";

/** Full registry used by the long-running worker (includes Chromium PDF rendering). */
export const handlers: Record<JobType, JobHandler> = {
  ...webSafeHandlers,
  pdf_render: pdfRender,
};
