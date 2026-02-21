import { useRouteContext, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { setViewportServerFn } from "@/lib/viewport";

const MOBILE_BREAKPOINT = 768;

const mobileKeywords = [
  "android",
  "webos",
  "iphone",
  "ipad",
  "ipod",
  "blackberry",
  "windows phone",
  "mobile",
];

const detectIsMobile = () => {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const isMobileUA = mobileKeywords.some((keyword) =>
    navigator.userAgent.toLowerCase().includes(keyword),
  );
  return (
    mediaQuery.matches || (isMobileUA && window.innerWidth <= MOBILE_BREAKPOINT)
  );
};

export const useIsMobile = () => {
  const { isMobile } = useRouteContext({ from: "__root__" });
  const router = useRouter();
  const prevRef = useRef(isMobile);

  useEffect(() => {
    const checkAndPersist = () => {
      const detected = detectIsMobile();

      if (detected !== prevRef.current) {
        prevRef.current = detected;
        setViewportServerFn({ data: detected ? "mobile" : "desktop" }).then(
          () => router.invalidate(),
        );
      }
    };

    checkAndPersist();

    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    mq.addEventListener("change", checkAndPersist);
    window.addEventListener("resize", checkAndPersist);

    return () => {
      mq.removeEventListener("change", checkAndPersist);
      window.removeEventListener("resize", checkAndPersist);
    };
  }, [router]);

  return { isMobile };
};
