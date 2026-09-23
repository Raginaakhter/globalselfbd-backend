// Import product FACTS (name, brand, size, category, price, availability, origin tags) from a public
// Shopify storefront's /products.json into the Product table.
//
//   npx tsx prisma/import-products.ts [https://store-domain]
//
// Deliberately NOT imported: photos and marketing descriptions (the source's copyrighted material).
// Descriptions are generated per category, and `image` is left empty so the UI shows the emoji tile
// until you add your own photos (via the dashboard or by setting Product.image).
// Prices/stock are placeholders taken from the source — review them before going live.

import { PrismaClient } from "@prisma/client";
import { defaultCategories } from "./seed-site";

const prisma = new PrismaClient();
const SOURCE = (process.argv[2] || "https://samirahan.com.bd").replace(/\/$/, "");

// source product_type -> our category slug. Unlisted types (pets, birds, apparel, books…) are skipped.
const typeToCategory: Record<string, string> = {
  "Facial Care": "skincare", Skincare: "skincare", "Nose Strips": "skincare", "Facial Cleanser": "skincare",
  "Night Cream": "skincare", "Skin Serum": "skincare", "Eye Cream": "skincare", "Day Cream": "skincare",
  "Facial Wipes": "skincare", "Facial Exfoliator": "skincare", "Facial Mask": "skincare",
  "Vitamins & Supplements": "vitamins",
  "Drinks & Beverages": "snacks", "Sports & Energy Drinks": "snacks", "Healthy Food & Snacks": "snacks",
  "Biscuits & Cookies": "snacks", Chocolate: "snacks", "Chocolates & Candy": "snacks", "Chips & Popcorn": "snacks",
  "Deodorants & Anti-Perspirants": "personal-care", "Dental Hygiene": "personal-care", "Hair Care": "personal-care",
  "Bath & Body": "personal-care", "Personal Hygiene": "personal-care", "Hair Colour": "personal-care",
  Footcare: "personal-care", "Hair Styling": "personal-care",
  "Aromatherapy & Essential Oils": "fragrance",
  "Baby Care & Accessories": "baby", "Milk Formula": "baby", "Diaper Kit & Wipes": "baby", "Baby Food": "baby",
  "Baby Drinks & Supplements": "baby", "Baby Snack": "baby",
  "Cosmetics & Makeup": "beauty", "Lip Treatment": "beauty", "Face Primer": "beauty",
  Appliances: "home", "Household Needs": "home",
  "Cooking Ingredients": "grocery", "Breakfast Cereal & Spreads": "grocery",
};

const categoryCopy: Record<string, string> = {
  skincare: "Skin care essentials from an internationally recognised brand. Patch-test before first use and follow the directions on the pack.",
  vitamins: "A daily wellness supplement. Follow the recommended dose on the label and consult a healthcare professional if you have a medical condition.",
  snacks: "Imported snacks and drinks. Check the label for ingredients and allergen information before consuming.",
  "personal-care": "Everyday personal care from a trusted international brand. Follow the directions for use on the pack.",
  fragrance: "Aromatherapy and fragrance product. For external use only unless the label states otherwise.",
  baby: "Baby and mum essentials. Always follow the age guidance and preparation instructions on the pack.",
  beauty: "Makeup and beauty product from an international brand. Discontinue use if irritation occurs.",
  home: "Practical home and household product. Refer to the pack for usage and safety information.",
  grocery: "Imported pantry staple. Check the label for ingredients, allergens and storage instructions.",
};

type ShopifyVariant = { title: string; price: string; compare_at_price: string | null; available: boolean };
type ShopifyProduct = {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  published_at: string | null;
};

const SIZE_RE =
  /(\d+(?:\.\d+)?\s?(?:x\s?\d+(?:\.\d+)?\s?)?(?:ml|l|g|kg|mg|oz|tablets?|capsules?|caps|gummies|sachets?|pcs|packs?|sheets?|wipes|nappies|bags|servings))\b/i;

function sizeOf(p: ShopifyProduct): string {
  const v = p.variants[0];
  if (v && v.title && v.title !== "Default Title") return v.title;
  const m = p.title.match(SIZE_RE);
  return m ? m[1].replace(/\s+/g, " ") : "1 unit";
}

function highlightsOf(p: ShopifyProduct, size: string): string[] {
  const tags = new Set(p.tags.map((x) => x.trim()));
  const out = [`Brand: ${p.vendor}`, `Pack size: ${size}`];
  const imported = p.tags.find((x) => /^Imported from /i.test(x));
  if (imported) out.push(imported.replace(/^imported from/i, "Imported from"));
  for (const flag of ["Halal Suitable", "Halal Certified", "Vegan Suitable", "Cruelty-Free", "Dermatologically Tested", "BSTI Approved"]) {
    if (tags.has(flag)) out.push(flag);
  }
  return out.slice(0, 5);
}

async function fetchAll(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${SOURCE}/products.json?limit=250&page=${page}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) on page ${page}`);
    const { products } = (await res.json()) as { products: ShopifyProduct[] };
    if (products.length === 0) break;
    all.push(...products);
    if (products.length < 250) break;
    await new Promise((r) => setTimeout(r, 500)); // be polite to the source server
  }
  return all;
}

async function main() {
  console.log(`Fetching catalog from ${SOURCE} ...`);
  const source = await fetchAll();
  console.log(`  ${source.length} products found`);

  const catMeta = Object.fromEntries(defaultCategories.map((c) => [c.slug, c]));
  const rows = source
    .filter((p) => typeToCategory[p.product_type] && p.variants.some((v) => v.available) && !p.tags.includes("Pre-Order Only"))
    .map((p) => {
      const v = p.variants.find((x) => x.available)!;
      const category = typeToCategory[p.product_type];
      const price = Math.round(parseFloat(v.price));
      const cmp = v.compare_at_price ? Math.round(parseFloat(v.compare_at_price)) : 0;
      const rrp = cmp > price ? cmp : null;
      const size = sizeOf(p);
      return {
        id: `sr${p.id}`,
        name: p.title.trim(),
        brand: (p.vendor || "Other").trim(),
        category,
        size,
        price,
        rrp,
        emoji: catMeta[category].emoji,
        tint: catMeta[category].tint,
        badge: rrp ? `${Math.round(((rrp - price) / rrp) * 100)}% OFF` : (null as string | null),
        stock: 10, // placeholder — the source only exposes in/out of stock
        description: categoryCopy[category],
        highlights: JSON.stringify(highlightsOf(p, size)),
        published: p.published_at ? Date.parse(p.published_at) : 0,
        discount: rrp ? (rrp - price) / rrp : 0,
        group: null as string | null,
        sortOrder: 0,
      };
    })
    .filter((r) => r.price > 0);

  // Featured groups come from real signals only. Best-sellers is left empty: there is no sales data yet.
  [...rows]
    .filter((r) => r.discount > 0)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 6)
    .forEach((r, i) => {
      r.group = "top-deals";
      r.sortOrder = i + 1;
    });
  [...rows]
    .filter((r) => !r.group)
    .sort((a, b) => b.published - a.published)
    .slice(0, 10)
    .forEach((r, i) => {
      r.group = "new-arrivals";
      r.sortOrder = i + 1;
      r.badge = r.badge ?? "NEW";
    });

  // Retire the old fake sample catalog (kept, not deleted, because existing orders reference it).
  const retired = await prisma.product.updateMany({
    where: { NOT: { id: { startsWith: "sr" } } },
    data: { active: false, group: null },
  });
  console.log(`Deactivated ${retired.count} old sample products`);

  for (const row of rows) {
    const { published, discount, ...data } = row;
    void published;
    void discount;
    await prisma.product.upsert({
      where: { id: data.id },
      // Re-imports never overwrite fields you may have edited (image, price, stock, description).
      update: { name: data.name, brand: data.brand, category: data.category, size: data.size, group: data.group, sortOrder: data.sortOrder },
      create: { ...data, rating: 0, reviews: 0, active: true },
    });
  }
  console.log(`Imported ${rows.length} in-stock products (skipped pets, birds, apparel, books, unavailable, pre-order)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
