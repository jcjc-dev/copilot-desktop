<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github-dark.css';

  let { content = '' }: { content: string } = $props();
  let renderedHtml = $state('');
  let lastContent = '';

  // Configure marked with highlight.js
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Custom renderer for code blocks
  const renderer = new marked.Renderer();
  renderer.code = function({ text, lang }: { text: string; lang?: string }) {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    return `<div class="code-block-wrapper relative group my-3">
      <div class="code-header flex items-center justify-between px-4 py-2 bg-gray-700 dark:bg-gray-700 rounded-t-lg text-xs text-gray-300">
        <span>${language}</span>
        <button class="copy-btn opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white" data-code="${text.replace(/"/g, '&quot;')}">
          Copy
        </button>
      </div>
      <pre class="!mt-0 !rounded-t-none"><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>`;
  };

  $effect(() => {
    if (content === lastContent) return;
    lastContent = content;
    const raw = marked.parse(content, { renderer }) as string;
    // Strict DOMPurify config: only allow safe markdown/UI tags and attributes.
    // Dangerous tags (script, iframe, object, embed, form, input) and
    // event-handler attributes are explicitly forbidden to prevent XSS.
    renderedHtml = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
        'blockquote', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4',
        'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'del', 'sup', 'sub', 'img', 'button',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'id', 'src', 'alt', 'title',
        'data-code', 'aria-label',
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    });
  });

  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('copy-btn')) {
      const code = target.getAttribute('data-code') || '';
      navigator.clipboard.writeText(code);
      target.textContent = 'Copied!';
      setTimeout(() => { target.textContent = 'Copy'; }, 2000);
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="prose prose-sm dark:prose-invert max-w-none break-words" onclick={handleClick}>
  {@html renderedHtml}
</div>
