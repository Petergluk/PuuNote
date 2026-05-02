/**
 * Shared Tailwind Typography (prose) class strings.
 *
 * Three variants to avoid duplication across Card, FullScreenModal, TimelineView:
 *  - PROSE_CARD    — compact, used in tree card view
 *  - PROSE_FULL    — expanded, used in full-screen / focus modal
 *  - PROSE_TIMELINE — medium density, used in timeline list view
 */

export const PROSE_BASE = [
  "max-w-none break-words",
  "prose-headings:font-yanone prose-headings:font-medium prose-headings:tracking-[1px]",
  "prose-a:text-app-accent",
  "prose-hr:border-t-2 prose-hr:border-app-border prose-hr:my-4",
  "prose-h1:text-[2.8em] prose-h1:tracking-[0.5px]",
  "prose-h2:text-[2.4em]",
  "prose-h3:text-[2em]",
  "prose-h4:text-[1.6em]",
  "prose-h5:text-[1em] prose-h5:font-sans prose-h5:uppercase prose-h5:tracking-[0px] prose-h5:font-bold prose-h5:opacity-75",
  "prose-h6:text-[1em] prose-h6:font-mono prose-h6:font-bold prose-h6:opacity-60",
  "prose-code:px-1 prose-code:rounded",
  "prose-p:first:mt-0 prose-p:last:mb-0",
  "prose-h1:first:mt-0 prose-h2:first:mt-0 prose-h3:first:mt-0 prose-h4:first:mt-0",
].join(" ");

export const PROSE_CARD = [
  "prose prose-sm",
  PROSE_BASE,
  "prose-p:leading-relaxed prose-p:my-1.5",
  "prose-headings:mt-2 prose-headings:mb-1",
  "prose-ul:my-1.5 prose-li:my-0.5",
  "prose-h4:opacity-85",
  "prose-code:text-app-text-primary dark:prose-code:text-app-accent",
  "prose-code:bg-app-card dark:prose-code:bg-app-card",
].join(" ");

/** Bright (active/in-path) variant for card colours */
export const PROSE_CARD_BRIGHT = [
  "prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary",
  "prose-p:text-app-text-primary dark:prose-p:text-app-text-primary",
  "prose-li:text-app-text-primary dark:prose-li:text-app-text-primary",
  "prose-strong:text-app-text-primary dark:prose-strong:text-app-text-primary",
].join(" ");

/** Dim (inactive) variant for card colours */
export const PROSE_CARD_DIM = [
  "prose-headings:text-app-text-muted dark:prose-headings:text-app-text-muted",
  "prose-p:text-app-text-muted dark:prose-p:text-app-text-muted",
  "prose-li:text-app-text-muted dark:prose-li:text-app-text-muted",
  "prose-strong:text-app-text-secondary dark:prose-strong:text-app-text-secondary",
].join(" ");

export const PROSE_FULL = [
  "prose dark:prose-invert prose-base",
  PROSE_BASE,
  "prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary",
  "prose-p:text-app-text-secondary dark:prose-p:text-app-text-muted",
  "prose-p:leading-relaxed prose-p:my-2",
  "prose-strong:text-app-text-primary dark:prose-strong:text-app-text-secondary",
  "prose-ul:text-app-text-secondary dark:prose-ul:text-app-text-muted",
  "prose-ol:text-app-text-secondary dark:prose-ol:text-app-text-muted",
  "prose-h4:opacity-80",
  "prose-code:text-app-accent prose-code:bg-app-card dark:prose-code:bg-app-card-hover",
].join(" ");

export const PROSE_TIMELINE = [
  "prose dark:prose-invert prose-base",
  PROSE_BASE,
  "prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary",
  "prose-p:text-app-text-secondary dark:prose-p:text-app-text-secondary",
  "prose-p:leading-relaxed prose-p:my-1",
  "prose-strong:text-app-text-primary dark:prose-strong:text-app-text-primary",
  "prose-ul:text-app-text-secondary dark:prose-ul:text-app-text-secondary",
  "prose-ol:text-app-text-secondary dark:prose-ol:text-app-text-secondary",
  "prose-li:text-app-text-secondary dark:prose-li:text-app-text-secondary",
  "prose-headings:mt-3 prose-headings:mb-1.5",
  "prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
  "prose-h4:opacity-80",
  "prose-code:text-app-text-primary dark:prose-code:text-app-accent",
  "prose-code:bg-transparent dark:prose-code:bg-transparent",
].join(" ");
