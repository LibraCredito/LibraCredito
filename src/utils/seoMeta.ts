export const setMetaTag = (name: string, content: string) => {
  if (typeof document === 'undefined') {
    return () => {};
  }

  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !meta;
  const previousContent = meta?.getAttribute('content') ?? null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);

  return () => {
    if (!meta) {
      return;
    }

    if (created) {
      meta.remove();
      return;
    }

    if (previousContent === null) {
      meta.removeAttribute('content');
      return;
    }

    meta.setAttribute('content', previousContent);
  };
};
