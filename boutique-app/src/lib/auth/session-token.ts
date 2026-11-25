const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;
const DEVELOPMENT_SECRET = "boutique-development-only-session-secret";

function getSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET;
  const secret =
    process.env.NODE_ENV === "production"
      ? configuredSecret
      : configuredSecret && configuredSecret !== "cambiar-por-secreto-seguro"
        ? configuredSecret
        : DEVELOPMENT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET debe configurarse con un secreto aleatorio.");
  }

  return secret;
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function createSessionToken(userId: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_COOKIE_MAX_AGE_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const payloadSeparator = payload.lastIndexOf(".");
  if (separator <= 0 || payloadSeparator <= 0 || !signature) return null;

  const userId = payload.slice(0, payloadSeparator);
  const expiresAt = Number(payload.slice(payloadSeparator + 1));
  if (!userId || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  try {
    if ((await sign(payload)) !== signature) return null;
    return userId;
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return null;
  }
}

export const sessionCookieMaxAge = SESSION_COOKIE_MAX_AGE_SECONDS;
