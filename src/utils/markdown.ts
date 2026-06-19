import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const renderMarkdown = (content: string): string => {
  if (!content) return '';

  const hasEncodedTags = /&lt;\/?[a-z][\s\S]*&gt;/i.test(content);
  const normalizedContent = hasEncodedTags ? decodeHtmlEntities(content) : content;

  // Parse markdown to HTML and sanitize
  const parsed = marked.parse(normalizedContent);
  const sanitized = DOMPurify.sanitize(parsed);

  // Inject Tailwind classes into allowed elements
  const div = document.createElement('div');
  div.innerHTML = sanitized;

  const addClass = (selector: string, classes: string) => {
    div.querySelectorAll(selector).forEach(el => {
      el.classList.add(...classes.split(' '));
    });
  };

  addClass('h1', 'text-3xl font-bold text-gray-900 mt-12 mb-8 border-l-4 border-blue-500 pl-4');
  addClass('h2', 'text-2xl font-bold text-gray-900 mt-10 mb-6 border-l-4 border-blue-500 pl-4');
  addClass('h3', 'text-xl font-semibold text-gray-900 mt-8 mb-4 border-l-4 border-blue-500 pl-4');
  addClass('p', 'mb-6 text-gray-700 leading-relaxed');
  addClass('a', 'text-blue-600 hover:text-blue-800 underline');
  addClass('strong', 'font-semibold text-gray-900');
  addClass('em', 'italic text-gray-700');
  addClass('blockquote', 'border-l-4 border-blue-500 bg-gray-50 p-4 my-6 italic text-gray-700');
  addClass('code', 'bg-gray-100 text-gray-900 px-2 py-1 rounded font-mono text-sm');
  addClass('ul', 'list-disc list-inside space-y-2 my-6 ml-4');
  addClass('ol', 'list-decimal list-inside space-y-2 my-6 ml-4');
  addClass('li', 'mb-2 text-gray-700');

  return div.innerHTML;
};

const decodeHtmlEntities = (value: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

export default renderMarkdown;
