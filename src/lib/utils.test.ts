import { describe, it, expect } from "vitest";
import { som, isOlderThan } from "./utils";

describe("som — акча форматы", () => {
  it("сом кошумчасы менен форматтайт", () => {
    expect(som(1250)).toContain("сом");
    expect(som(0)).toBe("0 сом");
    expect(som(null)).toBe("0 сом");
  });
});

describe("isOlderThan", () => {
  it("эски убакытта true кайтарат", () => {
    const old = new Date(Date.now() - 20 * 60000).toISOString();
    expect(isOlderThan(old, 15)).toBe(true);
  });
  it("жаңы убакытта false кайтарат", () => {
    const fresh = new Date(Date.now() - 2 * 60000).toISOString();
    expect(isOlderThan(fresh, 15)).toBe(false);
  });
});
