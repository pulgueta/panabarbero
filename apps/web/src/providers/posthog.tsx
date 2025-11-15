import { PostHogProvider as Provider } from "posthog-js/react";
import type { FC, PropsWithChildren } from "react";

import { env } from "@/env";

export const PostHogProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Provider
      apiKey={env.PUBLIC_POSTHOG_API_KEY}
      options={{ api_host: env.PUBLIC_POSTHOG_HOST }}
    >
      {children}
    </Provider>
  );
};
