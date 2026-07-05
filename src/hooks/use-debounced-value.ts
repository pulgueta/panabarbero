import { useDebouncedValue as usePacerDebouncedValue } from "@tanstack/react-pacer";

/**
 * Debounce a rapidly-changing value. The visible source (e.g. a search input)
 * stays instant; the returned value settles `delay` ms after the last change.
 * Use for free-text filters that feed a server query so we don't fire one
 * request per keystroke. Discrete/enum filters don't need this — apply those
 * immediately.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced] = usePacerDebouncedValue(value, {
    wait: delay,
  });
  return debounced;
}
