// node scripts/ios-version.ts <bundle id> <version>: prints the marketing version the next upload takes.
// Apple refuses a build for a version it already approved, so a nightly build of a live app moves up.
import { createPrivateKey, sign } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type Version = { version: string; state: string };
// A version in these states takes a new build, so its string stays.
const OPEN = [
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "INVALID_BINARY",
];

const parts = (v: string) => v.split(".").map(Number);
export function compare(a: string, b: string): number {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function bump(v: string): string {
  const p = parts(v);
  if (p.length < 3) return [...p, ...Array(2 - p.length).fill(0), 1].join(".");
  p[p.length - 1] = (p.at(-1) ?? 0) + 1;
  return p.join(".");
}

export function pick(pinned: string, versions: Version[]): string {
  const open = versions.find((v) => OPEN.includes(v.state));
  if (open) return open.version;
  const closed = versions
    .map((v) => v.version)
    .sort(compare)
    .at(-1);
  if (!closed || compare(pinned, closed) > 0) return pinned;
  return bump(closed);
}

async function versionsOf(bundleId: string): Promise<Version[] | null> {
  const { ASC_API_KEY_P8: pem, ASC_API_KEY_ID: kid, ASC_API_ISSUER_ID: iss } = process.env;
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: "ES256", kid, typ: "JWT" })}.${b64({ iss, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" })}`;
  const jwt = `${head}.${sign("sha256", Buffer.from(head), { key: createPrivateKey(pem ?? ""), dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  const get = async (path: string) => {
    const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
    return (await res.json()).data as { id: string; attributes: Record<string, string> }[];
  };
  const [app] = await get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  if (!app) return null;
  const list = await get(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=50`);
  return list.map((v) => ({
    version: v.attributes.versionString ?? "",
    state: v.attributes.appVersionState ?? "",
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [bundleId = "", pinned = ""] = process.argv.slice(2);
  const versions = await versionsOf(bundleId);
  const next = versions ? pick(pinned, versions) : pinned;
  if (next !== pinned) console.error(`Apple closed ${pinned}, so this build takes ${next}`);
  console.log(next);
}
