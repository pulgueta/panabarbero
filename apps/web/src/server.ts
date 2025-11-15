import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

const customHandler = defineHandlerCallback((ctx) => {
  return defaultStreamHandler(ctx);
});

const fetch = createStartHandler(customHandler);

export default createServerEntry({
  fetch,
});
