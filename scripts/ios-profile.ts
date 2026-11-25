// node scripts/ios-profile.ts <bundle id> <out dir>: finds or makes the App Store profile of the app
// through the App Store Connect API, on the team's one distribution certificate, and writes it to
// <out dir>/<uuid>.mobileprovision. Prints the profile name for PROVISIONING_PROFILE_SPECIFIER.
import { createPrivateKey, sign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { ASC_API_KEY_P8: pem, ASC_API_KEY_ID: kid, ASC_API_ISSUER_ID: iss } = process.env;
const [bundleId, outDir] = process.argv.slice(2);
if (!pem || !kid || !iss || !bundleId || !outDir) {
  throw new Error(
    "Set ASC_API_KEY_P8, ASC_API_KEY_ID and ASC_API_ISSUER_ID, and pass the bundle id and a folder",
  );
}

type Item = { id: string; attributes: Record<string, string> };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const head = `${b64({ alg: "ES256", kid, typ: "JWT" })}.${b64({ iss, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" })}`;
const jwt = `${head}.${sign("sha256", Buffer.from(head), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" }).toString("base64url")}`;

async function api(method: string, path: string, body?: unknown): Promise<Item[]> {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  const data = (JSON.parse(text) as { data: Item | Item[] }).data;
  return Array.isArray(data) ? data : [data];
}

const name = `${bundleId} App Store CI`;
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
let [profile] = (
  await api(
    "GET",
    `/v1/profiles?${q({ "filter[name]": name, "filter[profileType]": "IOS_APP_STORE" })}`,
  )
).filter((p) => p.attributes.profileState === "ACTIVE");
if (!profile) {
  const [bundle] = await api(
    "GET",
    `/v1/bundleIds?${q({ "filter[identifier]": bundleId, "filter[platform]": "IOS" })}`,
  );
  // An individual team gets few certificates, so every app signs with the one the team already holds.
  const certs = (
    await api("GET", `/v1/certificates?${q({ "filter[certificateType]": "DISTRIBUTION" })}`)
  ).sort((a, b) =>
    (b.attributes.expirationDate ?? "").localeCompare(a.attributes.expirationDate ?? ""),
  );
  if (!bundle || !certs[0])
    throw new Error(`No bundle id ${bundleId} or no distribution certificate on the team`);
  const relationships = {
    bundleId: { data: { type: "bundleIds", id: bundle.id } },
    certificates: { data: [{ type: "certificates", id: certs[0].id }] },
  };
  [profile] = await api("POST", "/v1/profiles", {
    data: { type: "profiles", attributes: { name, profileType: "IOS_APP_STORE" }, relationships },
  });
}
if (!profile?.attributes.profileContent)
  throw new Error(`Profile ${name} came back without its content`);
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, `${profile.attributes.uuid}.mobileprovision`),
  Buffer.from(profile.attributes.profileContent, "base64"),
);
console.log(name);
