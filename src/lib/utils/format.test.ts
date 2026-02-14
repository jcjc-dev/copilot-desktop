import { describe, it, expect } from 'vitest';
import { formatDate, truncateText } from './format';

describe('formatDate', () => {
  it('formats a date correctly', () => {
    const date = new Date(2026, 0, 15);
    const result = formatDate(date);
    expect(result).toContain('2026');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});

describe('truncateText', () => {
  it('returns text unchanged if shorter than maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates text and adds ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });
});
