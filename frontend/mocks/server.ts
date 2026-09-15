/**
 * MSW Node.js server — for Jest / future integration tests.
 * NOT used in the browser dev flow.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
