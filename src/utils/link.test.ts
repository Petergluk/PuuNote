import { describe, expect, it } from "vitest";
import { normalizeEditorLinkHref } from "./link";

describe("normalizeEditorLinkHref", () => {
  it("keeps supported absolute and relative hrefs", () => {
    expect(normalizeEditorLinkHref("https://example.com")).toBe(
      "https://example.com",
    );
    expect(normalizeEditorLinkHref("mailto:test@example.com")).toBe(
      "mailto:test@example.com",
    );
    expect(normalizeEditorLinkHref("#section")).toBe("#section");
    expect(normalizeEditorLinkHref("/docs/page")).toBe("/docs/page");
  });

  it("adds useful defaults for common inputs", () => {
    expect(normalizeEditorLinkHref("example.com")).toBe("https://example.com");
    expect(normalizeEditorLinkHref("test@example.com")).toBe(
      "mailto:test@example.com",
    );
  });

  it("rejects unsupported schemes", () => {
    expect(normalizeEditorLinkHref("javascript:alert(1)")).toBeNull();
    expect(normalizeEditorLinkHref("data:text/html,test")).toBeNull();
  });
});
