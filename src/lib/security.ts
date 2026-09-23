import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hash plain text password securely using bcrypt with 12 rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain text password against stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure 4-digit OTP code (0000 - 9999)
 */
export function generate4DigitOtp(): string {
  const randomInt = crypto.randomInt(0, 10000);
  return randomInt.toString().padStart(4, "0");
}

/**
 * Hash OTP code using SHA-256 for secure database storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Compare OTP code against SHA-256 hash
 */
export function verifyOtp(otp: string, hash: string): boolean {
  const inputHash = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(hash));
}

/**
 * Create a SHA-256 hash of a token for indexing/matching (e.g. refresh token / reset token)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random URL-safe token
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Sanitize user text input against script injection
 */
export function sanitizeInput(text: string): string {
  if (!text) return "";
  return text.trim().replace(/[<>]/g, "");
}
