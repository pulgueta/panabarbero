import {
  createRequestHandler,
  defaultStreamHandler,
} from "@tanstack/react-router/ssr/server";

import { getRouter } from "./router";

export async function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter: getRouter });

  return await handler(defaultStreamHandler);
}
