// Says whether a product of the repo changed since a base, so CI skips the jobs of an unchanged one.
//   node affected.ts --since checks|release [--product <name>] [--tag <glob>] [--base <commit>]
// Writes run, all, base, packages and filter to $GITHUB_OUTPUT and the reasons to $GITHUB_STEP_SUMMARY.
// The plan sits in specs/affected-ci.md of the workspace repo.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { type Config, type Pkg, decide, productOf, runCommit } from "./affected/decide.ts";

const sh = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const tryRun = (cmd: string, args: string[]) => {
  try {
    return sh(cmd, args);
  } catch {
    return null;
  }
};
const git = (...args: string[]) => tryRun("git", args);
// On Windows pnpm is a .cmd shim, which only a shell starts. Quotes keep the globs and brackets away from the shell.
const pnpm = (args: string[]) =>
  execFileSync(`pnpm ${args.map((a) => `"${a}"`).join(" ")}`, { encoding: "utf8", shell: true });

function ancestor(sha: string): boolean {
  if (git("cat-file", "-e", `${sha}^{commit}`) === null)
    git("fetch", "--quiet", "--no-tags", "origin", sha);
  return git("merge-base", "--is-ancestor", sha, "HEAD") !== null;
}

// The newest green run of the same workflow on main whose commit sits under HEAD.
function checksBase(workflowFile: string, head: string): [string | null, string] {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !workflowFile) return [null, "no GitHub run to compare with, so every check runs"];
  const file = workflowFile.split("/").pop();
  const shas = tryRun("gh", [
    "api",
    `repos/${repo}/actions/workflows/${file}/runs?branch=main&status=success&per_page=30`,
    "--jq",
    ".workflow_runs[] | [.head_sha, .display_title] | @tsv",
  ]);
  if (shas === null) return [null, `the runs of ${file} could not be read, so every check runs`];
  for (const line of shas.split("\n").filter(Boolean)) {
    const [headSha = "", title = ""] = line.split("\t");
    const sha = runCommit(headSha, title);
    if (sha === head) return [sha, `${head} passed ${file} already`];
    if (ancestor(sha)) return [sha, ""];
  }
  return [null, `no green ${file} run on main sits under ${head}, so every check runs`];
}

function releaseBase(tag: string): [string | null, string] {
  const last = git("describe", "--tags", "--abbrev=0", "--match", tag, "HEAD");
  if (last === null) return [null, `no tag matches ${tag}, so the whole product builds`];
  return [git("rev-list", "-n", "1", last), ""];
}

function packages(filter: string[], ignore: string[]): Pkg[] {
  if (!existsSync("pnpm-workspace.yaml")) return [];
  const args = [
    "list",
    "-r",
    "--depth",
    "-1",
    "--json",
    ...filter,
    ...ignore.map((g) => `--changed-files-ignore-pattern=${g}`),
  ];
  const list = JSON.parse(pnpm(args) || "[]") as { name: string; path: string }[];
  const root = process.cwd();
  return list
    .map((p) => ({ name: p.name, dir: relative(root, p.path).replaceAll("\\", "/") }))
    .filter((p) => p.dir !== "");
}

const { values } = parseArgs({
  options: {
    since: { type: "string" },
    product: { type: "string" },
    tag: { type: "string" },
    base: { type: "string" },
  },
});
const config: Config = existsSync(".github/affected.json")
  ? JSON.parse(readFileSync(".github/affected.json", "utf8"))
  : {};
const product = values.product ?? "";
const head = sh("git", ["rev-parse", "HEAD"]);
// owner/repo/.github/workflows/checks.yml@refs/heads/main
const workflowFile = (process.env.GITHUB_WORKFLOW_REF ?? "")
  .replace(/^[^/]+\/[^/]+\//, "")
  .replace(/@.*$/, "");
const ignore = config.ignore ?? ["**/*.md", "docs/**"];

if (git("rev-parse", "--is-shallow-repository") === "true")
  git("fetch", "--quiet", "--unshallow", "--tags", "origin");
let [base, why]: [string | null, string] = [null, ""];
if (values.base)
  [base, why] = [git("rev-parse", values.base), `${values.base} is not a commit here`];
else if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch")
  why = "a run by hand checks and builds everything";
else if (values.since === "release")
  [base, why] = releaseBase(values.tag || productOf(config, product).tag || "v*");
else if (values.since === "checks") [base, why] = checksBase(workflowFile, head);
else throw new Error("--since takes checks or release");

const files = base
  ? (git("diff", "--name-only", base, "HEAD") ?? "").split("\n").filter(Boolean)
  : [];
const result = decide({
  config,
  product,
  base: base === head ? head : base,
  why,
  files,
  workflowFile,
  workspace: base ? packages([], ignore) : [],
  changed:
    base && files.length ? packages([`--filter=...[${base}]`], ignore).map((p) => p.name) : [],
  // Each product with its packages and the workspace packages they depend on.
  closures: Object.fromEntries(
    Object.entries(base && files.length ? (config.products ?? {}) : {}).map(([name, p]) => [
      name,
      p.packages?.length
        ? packages(
            p.packages.map((n) => `--filter=${n}...`),
            [],
          ).map((q) => q.name)
        : [],
    ]),
  ),
});

const lines = [
  `run=${result.run}`,
  `all=${result.all}`,
  `base=${result.base}`,
  `packages=${JSON.stringify(result.packages)}`,
  `filter=${result.filter}`,
];
console.log([`affected ${product || "repo"}:`, ...lines, ...result.reasons].join("\n  "));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const state = result.all ? "everything" : result.run ? "changed" : "skipped";
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `**Affected ${product || "repo"}: ${state}**\n\n${result.reasons.map((r) => `- ${r}`).join("\n")}\n`,
  );
}
