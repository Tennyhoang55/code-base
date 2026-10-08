import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, value] = hash.split("$");
  if (algorithm !== "scrypt" || !salt || !value || value.length !== 128)
    return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(value, "hex"));
}

export function temporaryPassword() {
  return randomBytes(12).toString("base64url");
}
