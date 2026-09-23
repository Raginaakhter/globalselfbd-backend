// Seed script — populates the Product table from the existing static catalog data.
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedSiteContent } from "./seed-site";

const prisma = new PrismaClient();

// Product catalog data (mirrored from src/lib/catalog.ts)
type SeedProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  price: number;
  emoji: string;
  tint: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
  highlights: string[];
  rrp?: number;
  badge?: string;
  group?: string;
  sortOrder: number;
};

const categoryCopy: Record<string, { description: string; highlights: string[] }> = {
  vitamins: {
    description:
      "A trusted daily wellness essential, formulated to international quality standards and imported from authorised distributors. Suitable for adults as part of a balanced diet and healthy lifestyle.",
    highlights: ["100% authentic & sealed", "Batch-tested for purity", "Vegetarian friendly", "Store below 25°C"],
  },
  health: {
    description:
      "Reliable health and wellness support from a globally recognised brand. Always read the label and follow the directions for use; consult a healthcare professional if symptoms persist.",
    highlights: ["Authorised import", "Clear dosage guidance", "Tamper-evident packaging", "Long shelf life"],
  },
  beauty: {
    description:
      "Salon-quality beauty essentials for every day. Dermatologically tested, cruelty-free formulas that look great and feel comfortable all day long.",
    highlights: ["Dermatologically tested", "Cruelty-free", "Long-lasting wear", "Suitable for all skin tones"],
  },
  skincare: {
    description:
      "A dermatologist-loved skin care formula that hydrates, protects and restores. Gentle enough for daily use and free from harsh irritants.",
    highlights: ["Fragrance-light formula", "Non-comedogenic", "Suitable for sensitive skin", "Dermatologist recommended"],
  },
  baby: {
    description:
      "Gentle, carefully selected care for babies and mums. Made with mild ingredients and tested for safety so you can use it with confidence.",
    highlights: ["Tear-free & mild", "Paediatrician approved", "No harsh chemicals", "Safe for newborn skin"],
  },
  "personal-care": {
    description:
      "Everyday personal care that keeps you feeling fresh and confident from morning to night, made with skin-friendly ingredients.",
    highlights: ["Skin-friendly formula", "Long-lasting freshness", "Travel-friendly size", "Authentic import"],
  },
  fragrance: {
    description:
      "A signature scent crafted with premium fragrance oils. Lasting character with a beautiful trail — perfect for everyday wear or special occasions.",
    highlights: ["Long-lasting 6–8 hours", "Premium fragrance oils", "Gift-ready packaging", "100% original"],
  },
  grocery: {
    description:
      "Premium imported pantry staples, sourced from trusted producers around the world. Check the pack for the best-before date and storage advice.",
    highlights: ["Carefully sourced", "Best-before date on pack", "No artificial colours", "Sealed for freshness"],
  },
  snacks: {
    description:
      "Imported treats and drinks to enjoy anytime. Freshly stocked with clear best-before dates on every pack.",
    highlights: ["Imported & sealed", "Fresh stock", "No artificial preservatives", "Great for gifting"],
  },
  devices: {
    description:
      "A dependable home health device with easy-to-read results and a simple one-touch operation. Includes a manufacturer warranty.",
    highlights: ["Clinically validated", "Easy one-touch use", "Includes batteries", "12-month warranty"],
  },
  "sun-care": {
    description:
      "Broad-spectrum sun protection that is water-resistant and lightweight on skin — protects against UVA and UVB without a greasy feel.",
    highlights: ["Broad-spectrum SPF 50+", "Water resistant", "Non-greasy finish", "Dermatologically tested"],
  },
  home: {
    description: "Practical home and kitchen essentials designed to last, with quality materials and thoughtful design.",
    highlights: ["Durable materials", "Easy to clean", "Space-saving design", "Authentic import"],
  },
};

function p(
  id: string,
  name: string,
  brand: string,
  category: string,
  size: string,
  price: number,
  emoji: string,
  tint: string,
  rating: number,
  reviews: number,
  extra: { rrp?: number; badge?: string } = {},
  group: string | undefined,
  sortOrder: number
): SeedProduct {
  const stock = 12 + ((reviews * 7) % 40);
  const copy = categoryCopy[category] ?? { description: "", highlights: [] };
  return {
    id,
    name,
    brand,
    category,
    size,
    price,
    emoji,
    tint,
    rating,
    reviews,
    stock,
    description: copy.description,
    highlights: copy.highlights,
    ...extra,
    group,
    sortOrder,
  };
}

const products: SeedProduct[] = [
  // Best sellers
  p("bs1", "Vitamin C 1000mg Effervescent", "Swisse", "vitamins", "60 tablets", 1450, "🍊", "bg-orange-50", 4.8, 342, { rrp: 2100, badge: "31% OFF" }, "best-sellers", 1),
  p("bs2", "Omega-3 Fish Oil 1000mg", "Blackmores", "vitamins", "100 capsules", 1890, "🐟", "bg-sky-50", 4.7, 218, { rrp: 2650, badge: "29% OFF" }, "best-sellers", 2),
  p("bs3", "Hyaluronic Acid Serum", "Cerave", "skincare", "30 ml", 1250, "💧", "bg-cyan-50", 4.9, 501, { rrp: 1800, badge: "30% OFF" }, "best-sellers", 3),
  p("bs4", "Baby Gentle Wash & Shampoo", "Johnson's", "baby", "400 ml", 690, "🧴", "bg-violet-50", 4.6, 176, { rrp: 890 }, "best-sellers", 4),
  p("bs5", "Multivitamin Daily Complete", "Centrum", "vitamins", "90 tablets", 1590, "💊", "bg-emerald-50", 4.7, 289, { rrp: 2200, badge: "28% OFF" }, "best-sellers", 5),
  p("bs6", "SPF 50+ Sunscreen Lotion", "Neutrogena", "sun-care", "150 ml", 980, "☀️", "bg-yellow-50", 4.8, 402, { rrp: 1350 }, "best-sellers", 6),
  // Top deals
  p("td1", "Whey Protein Isolate Chocolate", "Nature's Way", "vitamins", "1 kg", 4200, "💪", "bg-amber-50", 4.8, 156, { rrp: 6500, badge: "35% OFF" }, "top-deals", 1),
  p("td2", "Collagen Beauty Powder", "Swisse", "skincare", "250 g", 2350, "✨", "bg-pink-50", 4.6, 98, { rrp: 3400, badge: "31% OFF" }, "top-deals", 2),
  p("td3", "Digital Blood Pressure Monitor", "Omron", "devices", "1 unit", 3450, "🩺", "bg-teal-50", 4.7, 134, { rrp: 4900, badge: "30% OFF" }, "top-deals", 3),
  p("td4", "Vitamin D3 + K2 Drops", "Blackmores", "vitamins", "30 ml", 1150, "☀️", "bg-yellow-50", 4.9, 211, { rrp: 1650, badge: "30% OFF" }, "top-deals", 4),
  p("td5", "Premium Manuka Honey MGO 400+", "Comvita", "grocery", "250 g", 4900, "🍯", "bg-orange-50", 4.9, 87, { rrp: 6800, badge: "28% OFF" }, "top-deals", 5),
  p("td6", "Electric Toothbrush Sonic", "Oral-B", "personal-care", "1 unit", 2790, "🪥", "bg-sky-50", 4.5, 120, { rrp: 4200, badge: "34% OFF" }, "top-deals", 6),
  // New arrivals
  p("na1", "Korean Snail Mucin Essence", "COSRX", "skincare", "100 ml", 1650, "🐌", "bg-lime-50", 4.8, 64, { badge: "NEW" }, "new-arrivals", 1),
  p("na2", "Australian Sheep Placenta Cream", "Nature's Care", "skincare", "100 g", 1290, "🧴", "bg-rose-50", 4.6, 42, { badge: "NEW" }, "new-arrivals", 2),
  p("na3", "Organic Baby Cereal", "Heinz", "baby", "200 g", 590, "🥣", "bg-amber-50", 4.7, 31, { badge: "NEW" }, "new-arrivals", 3),
  p("na4", "Imported Dark Chocolate 85%", "Lindt", "snacks", "100 g", 420, "🍫", "bg-orange-50", 4.9, 76, { badge: "NEW" }, "new-arrivals", 4),
  p("na5", "Magnesium Sleep Support", "Blackmores", "vitamins", "60 capsules", 1350, "🌙", "bg-indigo-50", 4.7, 55, { badge: "NEW" }, "new-arrivals", 5),
  p("na6", "Eau de Parfum — Floral Bloom", "L'Oréal", "fragrance", "50 ml", 3990, "🌸", "bg-pink-50", 4.8, 39, { badge: "NEW" }, "new-arrivals", 6),
  p("na7", "Probiotic Gut Health", "Swisse", "vitamins", "30 capsules", 2150, "🦠", "bg-emerald-50", 4.6, 47, { badge: "NEW" }, "new-arrivals", 7),
  p("na8", "Vitamin E Body Lotion", "Nivea", "personal-care", "500 ml", 790, "🧴", "bg-cyan-50", 4.5, 90, { badge: "NEW" }, "new-arrivals", 8),
  p("na9", "Imported Oat Milk", "Oatly", "grocery", "1 L", 520, "🥛", "bg-lime-50", 4.4, 28, { badge: "NEW" }, "new-arrivals", 9),
  p("na10", "Kids Gummy Multivitamin", "Centrum", "baby", "60 gummies", 1190, "🧸", "bg-violet-50", 4.8, 73, { badge: "NEW" }, "new-arrivals", 10),
  // Extra range so every category has stock
  p("x1", "Matte Lipstick — Rosewood", "L'Oréal", "beauty", "3.5 g", 890, "💄", "bg-rose-50", 4.6, 120, {}, undefined, 0),
  p("x2", "Volume Mascara Waterproof", "Garnier", "beauty", "9 ml", 750, "👁️", "bg-pink-50", 4.5, 88, {}, undefined, 0),
  p("x3", "Paracetamol 500mg", "Napa", "health", "100 tablets", 180, "💊", "bg-sky-50", 4.7, 240, {}, undefined, 0),
  p("x4", "Digital Thermometer", "Omron", "devices", "1 unit", 650, "🌡️", "bg-teal-50", 4.6, 175, {}, undefined, 0),
  p("x5", "Non-stick Frying Pan 28cm", "Tefal", "home", "1 unit", 2250, "🍳", "bg-indigo-50", 4.5, 66, {}, undefined, 0),
  p("x6", "Ceramic Coffee Mug Set", "Corelle", "home", "Set of 4", 1490, "☕", "bg-amber-50", 4.4, 41, {}, undefined, 0),
  p("x7", "Imported Basmati Rice 5kg", "Daawat", "grocery", "5 kg", 1150, "🍚", "bg-lime-50", 4.7, 210, {}, undefined, 0),
  p("x8", "Sparkling Fruit Juice", "Ceres", "snacks", "1 L", 390, "🧃", "bg-orange-50", 4.3, 52, {}, undefined, 0),
  p("x9", "Face Wash Gentle Foaming", "Cetaphil", "skincare", "236 ml", 1320, "🧼", "bg-cyan-50", 4.8, 310, { rrp: 1650 }, undefined, 0),
  p("x10", "Nappies Size 3 (Pack of 60)", "Pampers", "baby", "60 pcs", 1890, "👶", "bg-violet-50", 4.7, 198, {}, undefined, 0),
];

async function main() {
  console.log("🌱 Seeding products...");

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        name: prod.name,
        brand: prod.brand,
        category: prod.category,
        size: prod.size,
        price: prod.price,
        rrp: prod.rrp ?? null,
        emoji: prod.emoji,
        tint: prod.tint,
        badge: prod.badge ?? null,
        rating: prod.rating,
        reviews: prod.reviews,
        stock: prod.stock,
        description: prod.description,
        highlights: JSON.stringify(prod.highlights),
        group: prod.group ?? null,
        sortOrder: prod.sortOrder,
        active: true,
      },
      create: {
        id: prod.id,
        name: prod.name,
        brand: prod.brand,
        category: prod.category,
        size: prod.size,
        price: prod.price,
        rrp: prod.rrp ?? null,
        emoji: prod.emoji,
        tint: prod.tint,
        badge: prod.badge ?? null,
        rating: prod.rating,
        reviews: prod.reviews,
        stock: prod.stock,
        description: prod.description,
        highlights: JSON.stringify(prod.highlights),
        group: prod.group ?? null,
        sortOrder: prod.sortOrder,
        active: true,
      },
    });
  }

  console.log(`✅ Seeded ${products.length} products`);

  console.log("🌱 Seeding site content...");
  await seedSiteContent(prisma);
  console.log("✅ Seeded categories and site content");

  console.log("🌱 Ensuring an admin account exists...");
  await seedAdminUser();
}

// Idempotent — safe to run on every deploy. Creates (or promotes) a single admin account so
// there's always a way into /admin without hand-editing the database. Override the defaults via
// ADMIN_EMAIL / ADMIN_PASSWORD in .env for anything beyond local development.
async function seedAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@globalshelfbd.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({ where: { email }, data: { role: "admin" } });
      console.log(`✅ Promoted existing user ${email} to admin`);
    } else {
      console.log(`✅ Admin account ${email} already exists`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: "Global Shelf BD Admin",
      email,
      passwordHash,
      provider: "local",
      role: "admin",
      emailVerified: true,
    },
  });
  console.log(`✅ Created admin account ${email} (password: ${password}) — sign in, then change the password via the API`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
