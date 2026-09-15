/**
 * MSW browser worker — used in Next.js client-side dev mode.
 * Imported by MSWProvider, never by server code.
 */
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
