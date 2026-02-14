import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Test the markdown rendering pipeline directly
describe('MarkdownRenderer logic', () => {
  it('renders bold text', () => {
    const result = marked.parse('**bold** text') as string;
    expect(result).toContain('<strong>bold</strong>');
  });

  it('renders italic text', () => {
    const result = marked.parse('*italic* text') as string;
    expect(result).toContain('<em>italic</em>');
  });

  it('renders code blocks', () => {
    const result = marked.parse('```js\nconsole.log("hi")\n```') as string;
    expect(result).toContain('<code');
    expect(result).toContain('console.log');
  });

  it('renders inline code', () => {
    const result = marked.parse('use `const` here') as string;
    expect(result).toContain('<code>const</code>');
  });

  it('renders links', () => {
    const result = marked.parse('[link](https://example.com)') as string;
    expect(result).toContain('href="https://example.com"');
  });

  it('renders unordered lists', () => {
    const result = marked.parse('- item 1\n- item 2') as string;
    expect(result).toContain('<li>');
    expect(result).toContain('item 1');
    expect(result).toContain('item 2');
  });

  it('renders ordered lists', () => {
    const result = marked.parse('1. first\n2. second') as string;
    expect(result).toContain('<ol');
    expect(result).toContain('<li>');
  });

  it('renders headings', () => {
    const result = marked.parse('## Heading 2') as string;
    expect(result).toContain('<h2');
    expect(result).toContain('Heading 2');
  });

  it('sanitizes script tags', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('<script>');
  });

  it('sanitizes event handlers', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('onerror');
  });

  it('preserves safe HTML through sanitization', () => {
    const safe = '<strong>bold</strong> and <em>italic</em>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('<strong>bold</strong>');
    expect(sanitized).toContain('<em>italic</em>');
  });

  it('handles the full render pipeline (parse + sanitize)', () => {
    const markdown = '**Hello** world\n\n- item 1\n- item 2';
    const raw = marked.parse(markdown) as string;
    const sanitized = DOMPurify.sanitize(raw);
    expect(sanitized).toContain('<strong>Hello</strong>');
    expect(sanitized).toContain('<li>');
  });
});
