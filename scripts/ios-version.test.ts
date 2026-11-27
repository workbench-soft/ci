import { describe, expect, it } from "vitest";
import { bump, pick } from "./ios-version.ts";

const live = (version: string) => ({ version, state: "READY_FOR_DISTRIBUTION" });

describe("ios-version", () => {
  it("bumps the last number, and gives a 2 part version a third", () => {
    expect(bump("1.1")).toBe("1.1.1");
    expect(bump("1.1.1")).toBe("1.1.2");
    expect(bump("2026.11.26")).toBe("2026.11.27");
    expect(bump("2")).toBe("2.0.1");
  });

  it("keeps the pinned version of a new app or one above every live version", () => {
    expect(pick("1.0", [])).toBe("1.0");
    expect(pick("1.2", [live("1.1")])).toBe("1.2");
  });

  it("moves past the newest live version", () => {
    expect(pick("1.0", [live("1.0")])).toBe("1.0.1");
    expect(pick("1.1", [live("1.1"), live("1.0")])).toBe("1.1.1");
    expect(pick("2026.11.26", [live("2026.11.26"), live("2026.11.25")])).toBe("2026.11.27");
    expect(pick("1.0", [live("1.0.10"), live("1.0.9")])).toBe("1.0.11");
  });

  it("takes the version that still accepts a build", () => {
    expect(pick("1.0", [{ version: "1.0.1", state: "REJECTED" }, live("1.0")])).toBe("1.0.1");
    expect(pick("1.1", [{ version: "1.1", state: "WAITING_FOR_REVIEW" }])).toBe("1.1");
  });
});
