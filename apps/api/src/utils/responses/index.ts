import { object } from "zod";

import { jsonContent } from "../parsers/json";

export function defaultResponse(message: string) {
  return jsonContent(
    object({
      message,
    }),
    message,
  );
}
