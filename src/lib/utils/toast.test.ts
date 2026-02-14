import { describe, it, expect, vi } from 'vitest';

// Mock svelte-sonner
vi.mock('svelte-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { showSuccess, showError, showInfo } from './toast';
import { toast } from 'svelte-sonner';

describe('toast utilities', () => {
  it('showSuccess calls toast.success', () => {
    showSuccess('Done!');
    expect(toast.success).toHaveBeenCalledWith('Done!');
  });

  it('showError calls toast.error', () => {
    showError('Failed!');
    expect(toast.error).toHaveBeenCalledWith('Failed!');
  });

  it('showInfo calls toast.info', () => {
    showInfo('FYI');
    expect(toast.info).toHaveBeenCalledWith('FYI');
  });

  it('showSuccess is a function', () => {
    expect(typeof showSuccess).toBe('function');
  });

  it('showError is a function', () => {
    expect(typeof showError).toBe('function');
  });

  it('showInfo is a function', () => {
    expect(typeof showInfo).toBe('function');
  });
});
