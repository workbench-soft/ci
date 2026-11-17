import { posix } from "node:path";

export type Product = { packages?: string[]; paths?: string[]; tag?: string };
export type Config = { global?: string[]; ignore?: string[]; products?: Record<string, Product> };
export type Pkg = { name: string; dir: string };

export const DEFAULT_IGNORE = ["**/*.md", "docs/**"];
// A change here reaches each package, so the whole repo counts as changed.
export const DEFAULT_GLOBAL = [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "package.json",
  "mise.toml",
  ".github/actions/**",
];

export type Input = {
  config: Config;
  product: string;
  // null when no base was found, with the reason in why.
  base: string | null;
  why: string;
  files: string[];
  workflowFile: string;
  // Every package of the pnpm workspace, the root left out.
  workspace: Pkg[];
  // The packages pnpm picks with --filter "...[<base>]".
  changed: string[];
  // For each product: its packages and the workspace packages they depend on.
  closures: Record<string, string[]>;
};

export type Result = {
  run: boolean;
  all: boolean;
  base: string;
  packages: string[];
  filter: string;
  reasons: string[];
};

// matchesGlob skips names that start with a dot, so ** also tries the path with each leading dot swapped out.
const undot = (file: string) => file.replace(/(^|\/)\./g, "$1_");
const hit = (file: string, globs: string[] | undefined) =>
  (globs ?? []).some((g) => posix.matchesGlob(file, g) || posix.matchesGlob(undot(file), g));
const inside = (file: string, dir: string) => file.startsWith(`${dir}/`);

// A workflow_run run keeps the newest commit of main as its head_sha, which can be newer than the commit it
// checked out. Such a workflow names its commit in run-name, and a full SHA in the run's title wins.
export const runCommit = (headSha: string, title: string) =>
  title.match(/\b[0-9a-f]{40}\b/)?.[0] ?? headSha;

export function productOf(config: Config, name: string): Product {
  if (!name) return {};
  const product = config.products?.[name];
  if (!product) throw new Error(`.github/affected.json has no product "${name}"`);
  return product;
}

function all(why: string): Result {
  return { run: true, all: true, base: "", packages: [], filter: "-r", reasons: [why] };
}

export function decide(input: Input): Result {
  const { config, workspace, closures } = input;
  const products = Object.keys(config.products ?? {});
  const product = productOf(config, input.product);
  if (input.base === null) return all(input.why);
  const files = input.files.filter((f) => !hit(f, config.ignore ?? DEFAULT_IGNORE));
  const reasons: string[] = [];
  for (const file of files) {
    if (file === input.workflowFile) return all(`${file} is the running workflow`);
    if (hit(file, config.global ?? DEFAULT_GLOBAL)) return all(`${file} reaches every package`);
    const pkg = workspace.find((p) => inside(file, p.dir));
    if (pkg && products.length && !products.some((name) => closures[name]?.includes(pkg.name)))
      return all(`${pkg.name} belongs to no product`);
    const owned =
      pkg !== undefined ||
      file.startsWith(".github/workflows/") ||
      Object.values(config.products ?? {}).some((p) => hit(file, p.paths));
    if (!owned) return all(`${file} belongs to no package or product`);
  }
  const changed = new Set(input.changed);
  let run: boolean;
  if (!input.product) {
    run = files.length > 0;
    if (run) reasons.push(`${files.length} files changed since ${input.base}`);
  } else {
    const byPath = files.filter((f) => hit(f, product.paths));
    const byPackage = (product.packages ?? []).filter((p) => changed.has(p));
    run = byPath.length > 0 || byPackage.length > 0;
    if (byPath.length) reasons.push(`${byPath.join(", ")} match the paths of ${input.product}`);
    if (byPackage.length) reasons.push(`${byPackage.join(", ")} changed or depend on a change`);
  }
  if (!run) reasons.push(`no change for ${input.product || "the repo"} since ${input.base}`);
  // A product's checks take its own packages and the changed ones it depends on.
  const reach = input.product ? new Set(closures[input.product] ?? []) : null;
  const picked = new Set(run ? [...changed].filter((p) => !reach || reach.has(p)) : []);
  if (run) for (const p of product.packages ?? []) picked.add(p);
  const packages = [...picked].sort();
  return {
    run,
    all: false,
    base: input.base,
    packages,
    filter: packages.map((p) => `--filter=${p}`).join(" "),
    reasons,
  };
}
