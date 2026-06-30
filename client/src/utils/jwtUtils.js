function decodeJwtPart(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

function encodeJwtPart(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function crearJwtMock(username) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: username,
    name: username,
    username,
    kind: "mock-login",
    iat: now,
    exp: now + 60 * 60 * 8,
  };

  return `${encodeJwtPart(header)}.${encodeJwtPart(payload)}.mock`;
}

export { decodeJwtPart };
