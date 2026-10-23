import type { RefObject } from "react";
import { useState } from "react";

function useLazyRef<T>(fn: () => T): RefObject<T> {
  // oxlint-disable-next-line react/hook-use-state -- the ref object is created once and never replaced, so it needs no setter
  const [ref] = useState<RefObject<T>>(() => ({ current: fn() }));

  return ref;
}

export { useLazyRef };
