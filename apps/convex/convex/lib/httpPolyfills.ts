// polyfill MessageChannel without using node:events
if (typeof MessageChannel === "undefined") {
  class MockMessagePort {
    onmessage: ((ev: MessageEvent) => void) | undefined;
    onmessageerror: ((ev: MessageEvent) => void) | undefined;

    addEventListener() {}
    close() {}

    dispatchEvent(_event: Event): boolean {
      return false;
    }

    postMessage(_message: unknown, _transfer: Transferable[] = []) {}
    removeEventListener() {}
    start() {}
  }

  class MockMessageChannel {
    port1: MockMessagePort;
    port2: MockMessagePort;

    constructor() {
      this.port1 = new MockMessagePort();
      this.port2 = new MockMessagePort();
    }
  }

  globalThis.MessageChannel =
    MockMessageChannel as unknown as typeof MessageChannel;
}
