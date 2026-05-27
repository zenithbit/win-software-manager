import { randomBytes } from "crypto";

const ALPHA_NUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const FULL_CHARSET = ALPHA_NUM + "!@#$%^&*-_+=";

/**
 * Generates a cryptographically random string.
 * Uses rejection sampling to eliminate modulo bias.
 */
export function generateRandomString(length: number, charset = FULL_CHARSET): string {
  let result = "";
  while (result.length < length) {
    const byte = randomBytes(1)[0];
    // Reject bytes that would cause modulo bias
    if (byte < Math.floor(256 / charset.length) * charset.length) {
      result += charset[byte % charset.length];
    }
  }
  return result;
}

/**
 * Generates a random username (alphanumeric only) and password (with special chars).
 */
export function generateCredentials(): { username: string; password: string } {
  return {
    username: generateRandomString(8, ALPHA_NUM),
    password: generateRandomString(10, FULL_CHARSET),
  };
}
