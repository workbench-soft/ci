import { describe, expect, it } from "vitest";
import { type Input, decide, runCommit } from "./decide.ts";

const memories: Input["config"] = {
  products: {
    mobile: { packages: ["memories-mobile"], paths: [".github/workflows/release.yml"] },
    desktop: {
      packages: ["memories-desktop"],
      paths: ["crates/**", ".github/workflows/desktop-*"],
    },
    shuttrix: { packages: ["shuttrix"], paths: ["crates/photo-develop*/**"] },
  },
};
const workspace = [
  { name: "memories-mobile", dir: "apps/mobile" },
  { name: "memories-desktop", dir: "apps/desktop" },
  { name: "shuttrix", dir: "apps/shuttrix" },
  { name: "photo-viewer", dir: "packages/photo-viewer" },
];

function run(product: string, files: string[], changed: string[] = [], extra: Partial<Input> = {}) {
  const input: Input = {
    config: memories,
    product,
    base: "abc",
    why: "",
    files,
    workflowFile: ".github/workflows/checks.yml",
    workspace,
    changed,
    closures: {
      mobile: ["memories-mobile", "photo-viewer"],
      desktop: ["memories-desktop"],
      shuttrix: ["shuttrix", "photo-viewer"],
    },
    ...extra,
  };
  return decide(input);
}

describe("decide", () => {
  it("skips a docs only push", () => {
    const r = run("mobile", [
      "README.md",
      "apps/mobile/docs/x.png",
      "docs/a.md",
      ".agents/skills/a/SKILL.md",
    ]);
    expect(r).toMatchObject({ run: false, all: false, packages: [] });
  });

  it("runs a product whose package depends on a changed package", () => {
    const changed = ["photo-viewer", "memories-mobile", "shuttrix"];
    const files = ["packages/photo-viewer/src/a.ts"];
    expect(run("mobile", files, changed)).toMatchObject({ run: true, all: false });
    expect(run("desktop", files, changed)).toMatchObject({ run: false });
    expect(run("mobile", files, changed).filter).toBe(
      "--filter=memories-mobile --filter=photo-viewer",
    );
  });

  it("counts a package that no product reaches as everything", () => {
    const extra = { workspace: [...workspace, { name: "nas-faces", dir: "services/nas-faces" }] };
    expect(run("mobile", ["services/nas-faces/a.ts"], ["nas-faces"], extra)).toMatchObject({
      all: true,
    });
  });

  it("runs a product through its paths, and adds its packages to the filter", () => {
    const r = run("desktop", ["crates/photo-core/src/lib.rs"]);
    expect(r).toMatchObject({ run: true, packages: ["memories-desktop"] });
  });

  it("counts a change to the running workflow as everything", () => {
    expect(run("mobile", [".github/workflows/checks.yml"])).toMatchObject({
      all: true,
      filter: "-r",
    });
  });

  it("leaves another product's workflow to that product", () => {
    expect(run("mobile", [".github/workflows/desktop-checks.yml"])).toMatchObject({
      run: false,
      all: false,
    });
    expect(run("desktop", [".github/workflows/desktop-checks.yml"])).toMatchObject({ run: true });
  });

  it("counts the lockfile and the tools as everything", () => {
    expect(run("mobile", ["pnpm-lock.yaml"]).all).toBe(true);
    expect(run("mobile", ["mise.toml"]).all).toBe(true);
  });

  it("counts a change to the product map as everything, with that reason", () => {
    const config = { products: { site: { paths: [".github/**"] } } };
    expect(run("site", [".github/affected.json"], [], { config })).toMatchObject({
      all: true,
      reasons: [".github/affected.json reaches every package"],
    });
  });

  it("counts a file no package or product owns as everything", () => {
    expect(run("desktop", ["tsconfig.base.json"])).toMatchObject({ all: true });
  });

  it("counts a missing base as everything", () => {
    const r = run("mobile", [], [], { base: null, why: "no tag matches v*" });
    expect(r).toMatchObject({ run: true, all: true, reasons: ["no tag matches v*"] });
  });

  it("runs the whole repo on any change outside the ignore list", () => {
    const one = { config: {}, workspace: [] };
    expect(run("", ["src/a.ts"], [], one)).toMatchObject({ run: true, all: true });
    expect(run("", ["CHANGELOG.md"], [], one)).toMatchObject({ run: false, all: false });
  });

  it("takes the ignore and global lists of the config", () => {
    const config = { ...memories, ignore: ["docs/**"], global: ["tsconfig.base.json"] };
    expect(
      run("mobile", ["apps/mobile/store/en.md"], ["memories-mobile"], { config }),
    ).toMatchObject({ run: true });
    expect(run("mobile", ["tsconfig.base.json"], [], { config }).all).toBe(true);
  });

  it("names a product missing from the config", () => {
    expect(() => run("web", ["a.ts"])).toThrow('no product "web"');
  });
});

describe("runCommit", () => {
  const head = "a".repeat(40);
  const shipped = "0123456789abcdef0123456789abcdef01234567";

  it("takes the commit a workflow_run run names in its title", () => {
    expect(runCommit(head, `Deploy web ${shipped}`)).toBe(shipped);
  });

  it("keeps the head of a run whose title names no commit", () => {
    expect(runCommit(head, "fix: a title with abc123 in it")).toBe(head);
  });
});
