import type { Ref, RefCallback } from "react";
import { useCallback } from "react";

type PossibleRef<T> = Ref<T> | undefined;

type RefCleanup = ReturnType<RefCallback<unknown>>;

function isRefCallback<T>(ref: PossibleRef<T>): ref is RefCallback<T> {
  return typeof ref === "function";
}

function isCleanupFunction(
  cleanup: RefCleanup,
): cleanup is Extract<RefCleanup, () => void> {
  return typeof cleanup === "function";
}

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T): RefCleanup {
  if (isRefCallback(ref)) {
    return ref(value);
  }

  if (ref !== null && ref !== undefined) {
    ref.current = value;
  }

  return undefined;
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  return (node) => {
    let hasCleanup = false;

    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);

      if (!hasCleanup && isCleanupFunction(cleanup)) {
        hasCleanup = true;
      }

      return cleanup;
    });

    // React <19 will log an error to the console if a callback ref returns a
    // value. We don't use ref cleanups internally so this will only happen if a
    // user's ref callback returns a value, which we only expect if they are
    // using the cleanup functionality added in React 19.
    return hasCleanup
      ? () => {
          for (let i = 0; i < cleanups.length; i++) {
            const cleanup = cleanups[i];

            if (isCleanupFunction(cleanup)) {
              cleanup();
            } else {
              setRef(refs[i], null);
            }
          }
        }
      : undefined;
  };
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  // oxlint-disable-next-line react/use-memo, react-hooks/exhaustive-deps -- the variadic refs are the dependency list; memoize by all of them
  return useCallback(composeRefs(...refs), refs);
}

export { useComposedRefs };
