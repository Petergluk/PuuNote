/**
 * Tiny className join utility.
 * Filters out falsy values and joins the rest with a space.
 *
 * Usage:
 *   cn("base", isActive && "active-class", isDragged && "dragged")
 */
export function cn(
  ...classes: (string | false | null | undefined | 0)[]
): string {
  return classes.filter(Boolean).join(" ");
}
