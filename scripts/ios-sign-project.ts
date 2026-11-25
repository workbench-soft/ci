// node scripts/ios-sign-project.ts <project.pbxproj> <bundle id> <team> <profile name>: sets manual
// App Store signing on each build configuration of the app target only. A command line setting
// would reach the Swift packages too, and they take no provisioning profile.
import { readFileSync, writeFileSync } from "node:fs";

const [file, bundleId, team, profile] = process.argv.slice(2);
if (!file || !bundleId || !team || !profile)
  throw new Error("Pass the pbxproj, the bundle id, the team and the profile name");

const keys = [
  "CODE_SIGN_STYLE",
  "DEVELOPMENT_TEAM",
  "CODE_SIGN_IDENTITY",
  "PROVISIONING_PROFILE_SPECIFIER",
  "PROVISIONING_PROFILE",
];
const settings = `CODE_SIGN_STYLE = Manual; DEVELOPMENT_TEAM = ${team}; CODE_SIGN_IDENTITY = "Apple Distribution"; PROVISIONING_PROFILE_SPECIFIER = "${profile}";`;
let count = 0;
const out = readFileSync(file, "utf8").replace(
  /buildSettings = \{([\s\S]*?)\n(\s*)\};/g,
  (block, body: string, indent: string) => {
    if (
      !new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = "?${bundleId.replaceAll(".", "\\.")}"?;`).test(body)
    )
      return block;
    count++;
    const kept = body
      .split("\n")
      .filter(
        (line) => !keys.some((k) => new RegExp(`^\\s*"?${k}(\\[[^\\]]*\\])?"? =`).test(line)),
      );
    return `buildSettings = {${kept.join("\n")}\n${indent}\t${settings}\n${indent}};`;
  },
);
if (count === 0)
  throw new Error(`No build configuration of ${file} has PRODUCT_BUNDLE_IDENTIFIER ${bundleId}`);
writeFileSync(file, out);
console.log(`Manual App Store signing on ${count} configurations of ${bundleId}`);
