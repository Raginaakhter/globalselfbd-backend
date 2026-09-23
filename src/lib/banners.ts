import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./prisma";
import type { HeroSlide } from "./site-types";

// Uploaded files live on disk and are served by express.static at /uploads.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BANNERS_DIR = path.join(UPLOADS_DIR, "banners");

export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
// Orphaned files are only removed once they are this old, so an image that was
// just uploaded but not yet saved into the banner list is never deleted.
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

export type Banner = { image: string; href: string; alt: string };

// Detect the real type from the file's magic bytes instead of trusting the client.
function detectImageExt(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString("ascii", 0, 6))) return "gif";
  return null;
}

/** Saves a base64 image (raw or data URL). Returns the public path, e.g. "/uploads/banners/abc.jpg". */
export async function saveBannerImage(base64: string): Promise<string> {
  const raw = base64.replace(/^data:[^;]+;base64,/, "");
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 0) throw new Error("Image is empty or not valid base64");
  if (buf.length > MAX_BANNER_BYTES) throw new Error("Image must be 5MB or smaller");

  const ext = detectImageExt(buf);
  if (!ext) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed");

  await fs.mkdir(BANNERS_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(BANNERS_DIR, name), buf);
  return `/uploads/banners/${name}`;
}

export async function getBanners(): Promise<Banner[]> {
  const row = await prisma.siteContent.findUnique({ where: { key: "heroSlides" } });
  let slides: HeroSlide[] = [];
  try {
    slides = row ? (JSON.parse(row.value) as HeroSlide[]) : [];
  } catch {
    slides = [];
  }
  return slides
    .filter((s) => s.image)
    .map((s) => ({ image: s.image!, href: s.href || "/shop", alt: s.title || "" }));
}

/** Replaces the storefront hero slides with image-only banners. */
export async function saveBanners(banners: Banner[]): Promise<void> {
  // The text fields are kept empty so the storefront's HeroSlide shape stays intact;
  // when `image` is set the storefront shows only the picture.
  const slides: HeroSlide[] = banners.map((b) => ({
    eyebrow: "",
    title: b.alt,
    bn: "",
    body: "",
    cta: "",
    href: b.href,
    gradient: "",
    emojis: [],
    image: b.image,
  }));
  const value = JSON.stringify(slides);
  await prisma.siteContent.upsert({
    where: { key: "heroSlides" },
    update: { value },
    create: { key: "heroSlides", value },
  });

  await removeOrphanedBannerFiles(banners.map((b) => b.image)).catch((err) =>
    console.error("Banner cleanup failed:", err)
  );
}

async function removeOrphanedBannerFiles(inUse: string[]): Promise<void> {
  const used = new Set(inUse.map((url) => path.basename(url)));
  let files: string[];
  try {
    files = await fs.readdir(BANNERS_DIR);
  } catch {
    return;
  }
  const now = Date.now();
  for (const file of files) {
    if (used.has(file)) continue;
    const full = path.join(BANNERS_DIR, file);
    const stat = await fs.stat(full);
    if (now - stat.mtimeMs > ORPHAN_GRACE_MS) await fs.unlink(full);
  }
}
