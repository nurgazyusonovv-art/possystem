import { describe, it, expect } from "vitest";
import { announceNumber } from "./sound";

describe("announceNumber — заказ номери 1..100 циклдик", () => {
  it("1..100 өзгөрбөйт", () => {
    expect(announceNumber(1)).toBe(1);
    expect(announceNumber(50)).toBe(50);
    expect(announceNumber(100)).toBe(100);
  });

  it("100дөн ашканда кайра 1ден башталат", () => {
    expect(announceNumber(101)).toBe(1);
    expect(announceNumber(150)).toBe(50);
    expect(announceNumber(200)).toBe(100);
    expect(announceNumber(201)).toBe(1);
    expect(announceNumber(305)).toBe(5);
  });
});
