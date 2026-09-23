// Download the first product photo for every imported product (ids "sr<shopifyId>") into
// public/products/ and store the local path in Product.image.
//
//   npx tsx prisma/import-images.ts [https://store-domain]
//
// Only fills products whose `image` is empty, so it is safe to re-run and never overwrites photos you
// have set yourself. Photos are downloaded (not hotlinked) so the site keeps working if the source
// changes or goes offline. Make sure you have the right to use them before going live.

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const SOURCE = (process.argv[2] || "https://samirahan.com.bd").replace(/\/$/, "");
const OUT_DIR = path.join(process.cwd(), "public", "products");
const WIDTH = 600; // plenty for cards and the product page, keeps files small
const CONCURRENCY = 6;

type ShopifyProduct = { id: number; images: { src: string }[] };

async function fetchAll(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${SOURCE}/products.json?limit=250&page=${page}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) on page ${page}`);
    const { products } = (await res.json()) as { products: ShopifyProduct[] };
    if (products.length === 0) break;
    all.push(...products);
    if (products.length < 250) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return all;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const pending = await prisma.product.findMany({
    where: { id: { startsWith: "sr" }, image: null },
    select: { id: true },
  });
  console.log(`${pending.length} products need an image`);
  if (pending.length === 0) return;

  console.log(`Fetching catalog from ${SOURCE} ...`);
  const source = new Map((await fetchAll()).map((p) => [`sr${p.id}`, p]));

  let done = 0;
  let failed = 0;
  let missing = 0;
  const queue = [...pending];

  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const src = source.get(item.id)?.images[0]?.src;
      if (!src) {
        missing++;
        continue;
      }
      try {
        const url = new URL(src);
        url.searchParams.set("width", String(WIDTH));
        const ext = path.extname(url.pathname).toLowerCase() || ".jpg";
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const file = `${item.id}${ext}`;
        await writeFile(path.join(OUT_DIR, file), Buffer.from(await res.arrayBuffer()));
        await prisma.product.update({ where: { id: item.id }, data: { image: `/products/${file}` } });
        done++;
        if (done % 50 === 0) console.log(`  ${done} downloaded...`);
      } catch (e) {
        failed++;
        console.error(`  ${item.id} failed:`, (e as Error).message);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done: ${done} images saved, ${missing} had no photo at the source, ${failed} failed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
