#!/usr/bin/env node
// IndexNow auto-submission: pings Bing/Yandex to crawl every URL in our sitemap.
// Run: node scripts/indexnow.mjs  (or: npm run indexnow)

const HOST = "www.mingli.study";
const KEY = "612a19321094b8e3a2a8defac9464bcc";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

async function main() {
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const sitemapRes = await fetch(SITEMAP_URL);
  if (!sitemapRes.ok) {
    console.error(`FAILURE: could not fetch sitemap (HTTP ${sitemapRes.status})`);
    process.exit(1);
  }
  const xml = await sitemapRes.text();

  const urlList = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) {
    console.error("FAILURE: no <loc> URLs found in sitemap");
    process.exit(1);
  }
  console.log(`Parsed ${urlList.length} URLs from sitemap`);

  // IndexNow allows up to 10,000 URLs per request; we are well under that.
  if (urlList.length > 10000) {
    console.error(`FAILURE: ${urlList.length} URLs exceeds the 10,000 per-request limit`);
    process.exit(1);
  }

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  console.log(`Submitting to IndexNow (${INDEXNOW_ENDPOINT})...`);
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  console.log(`HTTP ${res.status} ${res.statusText}`);

  // IndexNow returns 200 (received) or 202 (accepted, validation pending) on success.
  if (res.ok) {
    console.log(`SUCCESS: submitted ${urlList.length} URLs to IndexNow`);
    return;
  }

  const text = await res.text().catch(() => "");
  console.error(`FAILURE: IndexNow rejected the request (HTTP ${res.status})`);
  if (text) console.error(text);
  process.exit(1);
}

main().catch((err) => {
  console.error("FAILURE: unexpected error");
  console.error(err);
  process.exit(1);
});
