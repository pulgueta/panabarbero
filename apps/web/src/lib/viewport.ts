import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const storageKey = "app-viewport";

export const getViewportServerFn = createServerFn().handler(
  () => getCookie(storageKey) ?? "desktop",
);

const setViewportValidator = z.enum(["mobile", "desktop"]);

export const setViewportServerFn = createServerFn()
  .inputValidator(setViewportValidator)
  .handler(({ data }) => setCookie(storageKey, data));
