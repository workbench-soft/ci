import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
// The run line of the affected step, as GitHub runs it.
const action = readFileSync(join(root, "actions/affected/action.yml"), "utf8");
// Windows names it Path, and a second PATH key would leave the pick to chance.
const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
const command = action.match(/^ {6}run: (mise x .*"\$SCRIPT".*?)\r?$/m)?.[1];

it("runs the script in a repo that pins no Node", { timeout: 120_000 }, () => {
  expect(command).toBeDefined();
  const repo = mkdtempSync(join(tmpdir(), "affected-nopin-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo });
  git("init", "-q");
  writeFileSync(join(repo, "mise.toml"), '[tools]\nshellcheck = "0.11.0"\n');
  writeFileSync(join(repo, "main.rs"), "fn main() {}\n");
  git("add", ".");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init");
  const out = execFileSync("bash", ["-c", command!], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      // Hides the Node of this test run and the global pin of this PC, as on a fresh runner.
      [pathKey]: (process.env[pathKey] ?? "")
        .split(delimiter)
        .filter((dir) => !/node/i.test(dir))
        .join(delimiter),
      MISE_GLOBAL_CONFIG_FILE: join(repo, "no-global.toml"),
      MISE_CONFIG_DIR: join(repo, "no-config"),
      MISE_TRUSTED_CONFIG_PATHS: repo,
      __MISE_DIFF: undefined,
      SINCE: "release",
      PRODUCT: "",
      TAG: "",
      SCRIPT: join(root, "scripts/affected.ts"),
      GITHUB_OUTPUT: join(repo, "out"),
    },
  });
  expect(out).toContain("run=true");
});
