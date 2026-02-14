<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github-dark.css';

  let { content = '' }: { content: string } = $props();
  let renderedHtml = $state('');

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
    const raw = marked.parse(content, { renderer }) as string;
    renderedHtml = DOMPurify.sanitize(raw, {
      ADD_TAGS: ['button'],
      ADD_ATTR: ['data-code', 'class'],
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
