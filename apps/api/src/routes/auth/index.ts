import { createBackendRouter } from "@/config";
import { auth } from "@/config/auth";

export const authRouter = createBackendRouter();

authRouter.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));
