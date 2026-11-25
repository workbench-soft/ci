// node scripts/iap-review-shots.ts <bundle id> <shots dir> <product=shot.png ...>: gives each in-app purchase of
// the app its App Review screenshot from the Maestro flows, through the App Store Connect API. A purchase that
// already has one keeps it. Apple holds a purchase in MISSING_METADATA until the shot is there.
import { createHash, createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { ASC_API_KEY_P8: pem, ASC_API_KEY_ID: kid, ASC_API_ISSUER_ID: iss } = process.env;
const [bundleId, dir, ...pairs] = process.argv.slice(2);
if (!pem || !kid || !iss || !bundleId || !dir) {
  throw new Error(
    "Set the ASC_API_KEY_* variables, and pass the bundle id, the shots folder and product=shot pairs",
  );
}

type Item = { id: string; attributes: Record<string, unknown> };
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
  const data = text ? (JSON.parse(text) as { data: Item | Item[] | null }).data : null;
  return data === null ? [] : Array.isArray(data) ? data : [data];
}

const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
const [app] = await api("GET", `/v1/apps?${q({ "filter[bundleId]": bundleId })}`);
if (!app) throw new Error(`No app ${bundleId} in App Store Connect`);
const purchases = await api("GET", `/v1/apps/${app.id}/inAppPurchasesV2?limit=200`);

for (const pair of pairs) {
  const [productId = "", shot = ""] = pair.split("=");
  const file = join(dir, shot);
  const purchase = purchases.find((p) => p.attributes.productId === productId);
  if (!purchase) throw new Error(`No in-app purchase ${productId}`);
  if (!existsSync(file)) throw new Error(`No screenshot ${file} from the flows`);
  const [old] = await api("GET", `/v2/inAppPurchases/${purchase.id}/appStoreReviewScreenshot`);
  if (old) {
    console.log(`${productId} keeps its review screenshot`);
    continue;
  }
  const bytes = readFileSync(file);
  const [made] = await api("POST", "/v1/inAppPurchaseAppStoreReviewScreenshots", {
    data: {
      type: "inAppPurchaseAppStoreReviewScreenshots",
      attributes: { fileName: shot, fileSize: bytes.length },
      relationships: { inAppPurchaseV2: { data: { type: "inAppPurchases", id: purchase.id } } },
    },
  });
  if (!made) throw new Error(`App Store Connect made no screenshot for ${productId}`);
  const ops = made.attributes.uploadOperations as {
    method: string;
    url: string;
    offset: number;
    length: number;
    requestHeaders: { name: string; value: string }[];
  }[];
  for (const op of ops) {
    const res = await fetch(op.url, {
      method: op.method,
      headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])),
      body: bytes.subarray(op.offset, op.offset + op.length),
    });
    if (!res.ok) throw new Error(`Upload of ${shot} failed: ${res.status}`);
  }
  await api("PATCH", `/v1/inAppPurchaseAppStoreReviewScreenshots/${made.id}`, {
    data: {
      type: "inAppPurchaseAppStoreReviewScreenshots",
      id: made.id,
      attributes: {
        uploaded: true,
        sourceFileChecksum: createHash("md5").update(bytes).digest("hex"),
      },
    },
  });
  console.log(`${productId} got ${shot} as its review screenshot`);
}
