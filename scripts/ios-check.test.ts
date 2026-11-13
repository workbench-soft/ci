import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { readAllow, report, scan } from "./ios-check.ts";

function app(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "ios-check-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof content === "string" ? content : JSON.stringify(content));
  }
  return dir;
}

const ids = (dir: string): string[] => scan(dir).map((i) => i.id);

describe("scan", () => {
  it("flags an Expo module without apple or ios", () => {
    const dir = app({
      "package.json": { dependencies: { expo: "58" } },
      "modules/speaker/expo-module.config.json": { platforms: ["android"] },
      "modules/listener/expo-module.config.json": { platforms: ["android", "apple"] },
      "modules/old/expo-module.config.json": { platforms: ["android", "ios"] },
    });
    expect(ids(dir)).toEqual(["module:speaker"]);
  });

  it("flags Android only packages from the list and any Shizuku package", () => {
    const dir = app({
      "package.json": {
        dependencies: {
          expo: "58",
          "@memories/play-purchase": "workspace:*",
          "react-native-shizuku": "1",
        },
        devDependencies: { "expo-intent-launcher": "58", "expo-iap": "4" },
      },
    });
    expect(ids(dir)).toEqual([
      "package:@memories/play-purchase",
      "package:react-native-shizuku",
      "package:expo-intent-launcher",
    ]);
  });

  it("flags Shizuku in a Gradle file", () => {
    const dir = app({
      "app/build.gradle.kts": 'implementation("dev.rikka.shizuku:api:13.1.5")',
      "ios/README": "",
    });
    expect(ids(dir)).toEqual(["gradle:dev.rikka.shizuku"]);
  });

  it("flags a Capacitor app with android and no ios folder", () => {
    const withAndroid = app({
      "capacitor.config.ts": "",
      "android/build.gradle": "",
      "package.json": {},
    });
    const withBoth = app({
      "capacitor.config.ts": "",
      "android/build.gradle": "",
      "ios/App/Podfile": "",
    });
    expect(ids(withAndroid)).toEqual(["capacitor:ios"]);
    expect(ids(withBoth)).toEqual([]);
  });

  it("flags a Kotlin wrapper and skips an Expo app with a committed android folder", () => {
    expect(
      ids(
        app({ "android/settings.gradle.kts": "", "package.json": { dependencies: { vite: "8" } } }),
      ),
    ).toEqual(["wrapper:android"]);
    expect(ids(app({ "settings.gradle.kts": "", "app/build.gradle.kts": "" }))).toEqual([
      "wrapper:.",
    ]);
    expect(
      ids(app({ "android/settings.gradle": "", "package.json": { dependencies: { expo: "58" } } })),
    ).toEqual([]);
  });

  it("finds nothing in an empty folder", () => {
    expect(ids(app({}))).toEqual([]);
  });
});

describe("allow file", () => {
  it("passes listed items, fails the rest and reports stale ids", () => {
    const items = [
      { id: "module:speaker", detail: "android only" },
      { id: "package:expo-intent-launcher", detail: "intents" },
    ];
    const { lines, failed } = report(items, {
      "package:expo-intent-launcher": "behind Platform.OS",
      "module:gone": "old",
    });
    expect(failed).toBe(true);
    expect(lines).toEqual([
      "missing  module:speaker: android only",
      "allowed  package:expo-intent-launcher: behind Platform.OS",
      "stale    module:gone: listed in ios-check.json, no longer found",
    ]);
    expect(
      report(items, { "module:speaker": "hidden on iOS", "package:expo-intent-launcher": "x" })
        .failed,
    ).toBe(false);
  });

  it("reads ios-check.json and rejects an empty reason", () => {
    expect(
      readAllow(app({ "ios-check.json": { allow: { "module:speaker": "hidden on iOS" } } })),
    ).toEqual({
      "module:speaker": "hidden on iOS",
    });
    expect(readAllow(app({}))).toEqual({});
    expect(() =>
      readAllow(app({ "ios-check.json": { allow: { "module:speaker": " " } } })),
    ).toThrow("needs a reason");
  });
});
