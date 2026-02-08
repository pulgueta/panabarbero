// Buffer polyfill for Convex runtime (required by Polar SDK)
import { Buffer as BufferPolyfill } from "buffer";

globalThis.Buffer = BufferPolyfill;
