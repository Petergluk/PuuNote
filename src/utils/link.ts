export const normalizeEditorLinkHref = (rawHref: string): string | null => {
  const href = rawHref.trim();
  if (!href) return null;

  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return href;
  }

  if (/^(#|\/|\.\/|\.\.\/)/.test(href)) {
    return href;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return null;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) {
    return `mailto:${href}`;
  }

  return `https://${href}`;
};
