import { PostHogProvider as Provider } from "posthog-js/react";
import type { FC, PropsWithChildren } from "react";

import { env } from "@/env";

export const PostHogProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider
      apiKey={env.VITE_POSTHOG_API_KEY}
      options={{ api_host: env.VITE_POSTHOG_HOST, autocapture: true }}
    >
      {children}
    </Provider>
  );
};
