import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MessageInput from './MessageInput.svelte';

// Mock the chat store
vi.mock('$lib/stores/chat', () => ({
  isStreaming: { subscribe: (fn: (v: boolean) => void) => { fn(false); return () => {}; } },
}));

describe('MessageInput', () => {
  it('renders textarea with placeholder', () => {
    const { getByPlaceholderText } = render(MessageInput);
    expect(getByPlaceholderText('Send a message...')).toBeTruthy();
  });

  it('renders send button', () => {
    const { getByLabelText } = render(MessageInput);
    expect(getByLabelText('Send message')).toBeTruthy();
  });

  it('send button is disabled when input is empty', () => {
    const { getByLabelText } = render(MessageInput);
    const sendBtn = getByLabelText('Send message') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it('send button enables when text is entered', async () => {
    const { getByPlaceholderText, getByLabelText } = render(MessageInput);
    const textarea = getByPlaceholderText('Send a message...') as HTMLTextAreaElement;

    await fireEvent.input(textarea, { target: { value: 'Hello' } });

    const sendBtn = getByLabelText('Send message') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(false);
  });

  it('clears input after sending', async () => {
    const onSend = vi.fn();
    const { getByPlaceholderText, getByLabelText } = render(MessageInput, {
      props: { onSend },
    });

    const textarea = getByPlaceholderText('Send a message...') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: 'Hello' } });
    await fireEvent.click(getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Hello');
    expect(textarea.value).toBe('');
  });

  it('does not send whitespace-only messages', async () => {
    const onSend = vi.fn();
    const { getByPlaceholderText, getByLabelText } = render(MessageInput, {
      props: { onSend },
    });

    const textarea = getByPlaceholderText('Send a message...') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: '   ' } });
    await fireEvent.click(getByLabelText('Send message'));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('textarea is disabled when disabled prop is true', () => {
    const { getByPlaceholderText } = render(MessageInput, {
      props: { disabled: true },
    });
    const textarea = getByPlaceholderText('Send a message...') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });
});
