import { describe, expect, it } from "vitest";
import { adjustHexTemperature } from "./themeTuning";

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

describe("themeTuning", () => {
  it("moves the warm edge toward orange sepia instead of lemon yellow", () => {
    const warm = hexToRgb(adjustHexTemperature("#fbfaf6", 50));

    expect(warm.r).toBeGreaterThan(warm.g);
    expect(warm.g).toBeGreaterThan(warm.b);
    expect(warm.r - warm.g).toBeGreaterThan(20);
  });

  it("moves the cold edge toward light blue", () => {
    const cold = hexToRgb(adjustHexTemperature("#fbfaf6", -50));

    expect(cold.b).toBeGreaterThan(cold.g);
    expect(cold.g).toBeGreaterThan(cold.r);
    expect(cold.b - cold.r).toBeGreaterThan(30);
  });
});
