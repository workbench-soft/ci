// Lists each Android only piece of an app with no iOS plan: node scripts/ios-check.ts <app dir>
// An item listed in <app dir>/ios-check.json with a reason passes. Any other item fails the run.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type Item = { id: string; detail: string };

// npm packages that work on Android only. Add one here when an app picks it up.
export const androidOnlyPackages: Record<string, string> = {
  "@memories/play-purchase": "Google Play Billing, StoreKit needs its own path",
  "@memories/self-update": "installs APKs, iOS allows installs from the App Store only",
  "expo-intent-launcher": "Android intents, its calls throw on iOS",
  "react-native-android-widget": "home screen widgets for Android only",
};
const androidOnlyPackagePattern = /shizuku/i;

// Gradle coordinates of Android only libraries, read from the build files.
export const androidOnlyGradle: Record<string, string> = {
  "dev.rikka.shizuku": "Shizuku runs privileged Android calls",
  "com.android.billingclient": "Google Play Billing",
  "com.google.android.play:app-update": "Play in-app updates",
};

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const dirs = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
const anyFile = (dir: string, names: string[]): boolean =>
  names.some((n) => existsSync(join(dir, n)));
const gradleFiles = ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"];
const hasXcode = (dir: string): boolean =>
  existsSync(join(dir, "ios")) ||
  readdirSync(dir).some((n) => n.endsWith(".xcodeproj") || n.endsWith(".xcworkspace"));

function dependencies(app: string): string[] {
  const path = join(app, "package.json");
  if (!existsSync(path)) return [];
  const pkg = readJson(path) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
}

function modules(app: string): Item[] {
  return dirs(join(app, "modules")).flatMap((name) => {
    const path = join(app, "modules", name, "expo-module.config.json");
    if (!existsSync(path)) return [];
    const config = readJson(path) as { platforms?: string[]; apple?: unknown; ios?: unknown };
    const platforms = config.platforms ?? [];
    const ios =
      platforms.includes("apple") ||
      platforms.includes("ios") ||
      "apple" in config ||
      "ios" in config;
    return ios
      ? []
      : [
          {
            id: `module:${name}`,
            detail: `modules/${name} is native for ${platforms.join(", ") || "no platform"} only`,
          },
        ];
  });
}

function packages(deps: string[]): Item[] {
  return deps.flatMap((name) => {
    const reason =
      androidOnlyPackages[name] ??
      (androidOnlyPackagePattern.test(name) ? "Shizuku is Android only" : undefined);
    return reason ? [{ id: `package:${name}`, detail: reason }] : [];
  });
}

function gradle(app: string): Item[] {
  const places = [
    "",
    "app",
    "android",
    "android/app",
    ...dirs(join(app, "modules")).map((m) => `modules/${m}/android`),
  ];
  const text = places
    .flatMap((p) => [...gradleFiles, "gradle/libs.versions.toml"].map((f) => join(app, p, f)))
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  return Object.entries(androidOnlyGradle)
    .filter(([coord]) => text.includes(coord))
    .map(([coord, detail]) => ({ id: `gradle:${coord}`, detail }));
}

function platformsOf(app: string, deps: string[]): Item[] {
  const capacitor = anyFile(app, [
    "capacitor.config.ts",
    "capacitor.config.json",
    "capacitor.config.js",
  ]);
  if (capacitor) {
    const missing = existsSync(join(app, "android")) && !existsSync(join(app, "ios"));
    return missing
      ? [
          {
            id: "capacitor:ios",
            detail: "Capacitor app with android/ and no ios/, run cap add ios",
          },
        ]
      : [];
  }
  if (deps.includes("expo") || hasXcode(app)) return [];
  return ["", "android"]
    .filter((p) => anyFile(join(app, p), gradleFiles))
    .map((p) => ({
      id: `wrapper:${p || "."}`,
      detail: `${p || "the app"} is a Kotlin app with no iOS project`,
    }));
}

export function scan(app: string): Item[] {
  const deps = dependencies(app);
  return [...modules(app), ...packages(deps), ...gradle(app), ...platformsOf(app, deps)];
}

export function readAllow(app: string): Record<string, string> {
  const path = join(app, "ios-check.json");
  if (!existsSync(path)) return {};
  const allow = (readJson(path) as { allow?: Record<string, unknown> }).allow ?? {};
  for (const [id, reason] of Object.entries(allow)) {
    if (typeof reason !== "string" || !reason.trim())
      throw new Error(`ios-check.json: ${id} needs a reason`);
  }
  return allow as Record<string, string>;
}

export function report(
  items: Item[],
  allow: Record<string, string>,
): { lines: string[]; failed: boolean } {
  const lines = items.map((i) =>
    allow[i.id] ? `allowed  ${i.id}: ${allow[i.id]}` : `missing  ${i.id}: ${i.detail}`,
  );
  const found = new Set(items.map((i) => i.id));
  lines.push(
    ...Object.keys(allow)
      .filter((id) => !found.has(id))
      .map((id) => `stale    ${id}: listed in ios-check.json, no longer found`),
  );
  return { lines, failed: items.some((i) => !allow[i.id]) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = resolve(process.argv[2] ?? ".");
  const { lines, failed } = report(scan(app), readAllow(app));
  console.log(lines.length ? lines.join("\n") : "No Android only pieces found.");
  if (failed)
    console.error(
      "\nPort each missing item to iOS, or list it in ios-check.json with the reason the app hides it on iOS.",
    );
  process.exitCode = failed ? 1 : 0;
}
