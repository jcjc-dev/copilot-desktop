import { beforeAll, afterEach } from 'vitest';

// jsdom doesn't have WebCrypto
beforeAll(() => {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer;
      },
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    },
  });
});
