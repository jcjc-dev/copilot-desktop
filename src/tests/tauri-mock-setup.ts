import { beforeAll, afterEach } from 'vitest';
import { randomFillSync } from 'crypto';

// jsdom doesn't have WebCrypto
beforeAll(() => {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (buffer: any) => randomFillSync(buffer),
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    },
  });
});
