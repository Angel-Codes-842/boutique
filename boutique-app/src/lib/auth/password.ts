import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedPassword.startsWith("scrypt$")) {
    const providedHash = await scrypt(password, "boutique-legacy-password-check", 32) as Buffer;
    const storedHash = await scrypt(storedPassword, "boutique-legacy-password-check", 32) as Buffer;
    return {
      valid: timingSafeEqual(providedHash, storedHash),
      needsRehash: true,
    };
  }

  const [, salt, encodedKey] = storedPassword.split("$");
  if (!salt || !encodedKey) return { valid: false, needsRehash: false };

  let expectedKey: Buffer;
  try {
    expectedKey = Buffer.from(encodedKey, "base64url");
  } catch {
    return { valid: false, needsRehash: false };
  }
  if (expectedKey.length !== KEY_LENGTH) return { valid: false, needsRehash: false };

  const actualKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return {
    valid: timingSafeEqual(actualKey, expectedKey),
    needsRehash: false,
  };
}
