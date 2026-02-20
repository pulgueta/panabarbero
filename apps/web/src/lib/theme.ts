import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const storageKey = "app-theme";
export const getThemeServerFn = createServerFn().handler(
  () => getCookie(storageKey) ?? "system",
);

const setThemeValidator = z.enum(["light", "dark", "system"]);

export const setThemeServerFn = createServerFn()
  .inputValidator(setThemeValidator)
  .handler(({ data }) => setCookie(storageKey, data));
