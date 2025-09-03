import { auth } from "@panabarbero/auth";

import { createBackendRouter } from "@/config";

export const authRouter = createBackendRouter();

authRouter.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));
