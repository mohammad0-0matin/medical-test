/**
 * @fileoverview Emergency / Temporary QR Pass utilities.
 *
 * Tokens are generated entirely on the client side: the payload contains a
 * patient summary snapshot (approved tests only), an expiry timestamp and an
 * optional SHA-256 PIN hash, all encoded as a UTF-8-safe Base64URL string.
 *
 * Security note: for centralized validation and global revocation, replace the
 * build/resolve helpers of this module with dedicated backend endpoints.
 *
 * @module utils/emergencyPass
 */

/** localStorage key holding currently active passes. */
const ACTIVE_KEY = 'salamatyar_emergency_passes';

/** localStorage key holding revoked token IDs (`jti`). */
const REVOKED_KEY = 'salamatyar_revoked_jtis';

/**
 * Available validity durations for an emergency pass.
 * `value` is expressed in hours.
 */
export const DURATIONS = [
  { value: '1', label: '۱ ساعت' },
  { value: '6', label: '۶ ساعت' },
  { value: '24', label: '۲۴ ساعت' },
  { value: '48', label: '۴۸ ساعت' },
];

/* ---------- Hashing ---------- */

/**
 * Deterministic FNV-1a style fallback used when Web Crypto is unavailable
 * (e.g. plain HTTP contexts). Not cryptographically secure; only used to keep
 * the PIN gate functional outside secure origins.
 *
 * @param {string} text - Raw input text.
 * @returns {string} Prefixed hexadecimal digest with input length suffix.
 */
const fallbackHash = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv:${hash.toString(16)}:${text.length}`;
};

/**
 * Computes the SHA-256 digest of a string as lowercase hex.
 * Falls back to {@link fallbackHash} when `crypto.subtle` is unavailable.
 *
 * @async
 * @param {string} text - Raw input text.
 * @returns {Promise<string>} Hexadecimal digest.
 */
export const sha256Hex = async (text) => {
  try {
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through to fallback hash */
  }
  return fallbackHash(text);
};

/* ---------- Base64URL (UTF-8 safe) ---------- */

/**
 * Encodes a JSON string as URL-safe Base64 without padding.
 * Uses TextEncoder first so Persian characters survive intact.
 *
 * @param {string} json - Serialized JSON payload.
 * @returns {string} Base64URL token.
 */
const encodeBase64Url = (json) => {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Decodes a URL-safe Base64 token back into its original JSON string.
 *
 * @param {string} token - Base64URL encoded token.
 * @returns {string} Deserialized raw JSON string.
 */
const decodeBase64Url = (token) => {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

/* ---------- Local registries ---------- */

/** Safely reads and parses JSON from localStorage. */
const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** Safely serializes and writes JSON to localStorage. */
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

/**
 * Returns the set of revoked pass IDs for this device.
 * Note: revocation is authoritative only on the generating browser
 * until a backend registry exists.
 *
 * @returns {Set<string>} Revoked `jti` values.
 */
export const getRevokedIds = () => new Set(readJson(REVOKED_KEY, []));

/**
 * Marks a pass as revoked on this device and removes it from the active list.
 *
 * @param {string} jti - Unique ID of the pass to revoke.
 * @returns {void}
 */
export const revokePass = (jti) => {
  const revoked = getRevokedIds();
  revoked.add(jti);
  writeJson(REVOKED_KEY, [...revoked]);
  writeJson(ACTIVE_KEY, readJson(ACTIVE_KEY, []).filter((p) => p && p.jti !== jti));
};

/**
 * Returns all non-expired, non-revoked passes, newest expiry first.
 *
 * @returns {Array<{jti:string,token:string,expiresAt:number}>} Active passes.
 */
export const getActivePasses = () => {
  const now = Date.now();
  const revoked = getRevokedIds();
  return readJson(ACTIVE_KEY, [])
    .filter((pass) => pass && pass.expiresAt > now && !revoked.has(pass.jti))
    .sort((a, b) => b.expiresAt - a.expiresAt);
};

/**
 * Persists a newly issued pass (keeps at most 5 records).
 *
 * @param {{jti:string,token:string,expiresAt:number}} record - Pass record.
 * @returns {void}
 */
export const saveActivePass = (record) => {
  const list = [record, ...getActivePasses()].slice(0, 5);
  writeJson(ACTIVE_KEY, list);
};

/* ---------- Build & Resolve ---------- */

/**
 * Builds an emergency pass token from the current profile and approved tests.
 *
 * Payload fields:
 * - `n` / `nc`: patient name and national code.
 * - `bg` / `al` / `md`: blood group, allergies summary and active medications
 *   (synced from the Health Summary via `extras`, when available).
 * - `ts`: compact snapshot of approved test results.
 * - `exp`: expiry timestamp; `pinHash`: optional SHA-256 of a 4-digit PIN.
 *
 * @async
 * @param {object} options - Generation options.
 * @param {object|null} options.profile - Logged-in patient profile.
 * @param {Array<object>} options.tests - Approved test results to include.
 * @param {number|string} options.durationHours - Pass validity in hours.
 * @param {string} [options.pin] - Optional 4-digit PIN.
 * @param {{bg?:string|null, al?:string|null, md?:string|null}} [options.extras]
 *   Health-summary overrides merged into the payload.
 * @returns {Promise<{token:string, jti:string, expiresAt:number, hasPin:boolean}>}
 */
export const buildEmergencyPass = async ({ profile, tests, durationHours, pin, extras = {} }) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + Number(durationHours) * 3600000;
  const jti = `${issuedAt.toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const pinHash = pin ? await sha256Hex(`pin:${pin}`) : null;

  const payload = {
    v: 1,
    jti,
    iat: issuedAt,
    exp: expiresAt,
    n: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    nc: profile?.national_code || '',
    bg: extras.bg ?? profile?.blood_group ?? null,
    al: extras.al ?? profile?.allergies ?? null,
    md: extras.md ?? null,
    pinHash,
    ts: tests.map((t) => ({
      tn: t.test_type_name || '',
      rv: t.result_value ?? null,
      rt: t.result_text || '',
      mn: t.min_range ?? t.lab_min_range ?? null,
      mx: t.max_range ?? t.lab_max_range ?? null,
      dt: t.test_date || '',
      un: t.unit || '',
      cn: t.cn || null,
    })),
  };

  const token = encodeBase64Url(JSON.stringify(payload));

  return { token, jti, expiresAt, hasPin: Boolean(pin) };
};

/**
 * Decodes and validates the structure of an emergency pass token.
 *
 * @param {string} token - Base64URL token from the route params.
 * @returns {{ok:true, data:object}|{ok:false, reason:'invalid'}}
 *   Parsed payload or an invalid-token marker.
 */
export const decodeEmergencyPass = (token) => {
  if (!token) return { ok: false, reason: 'invalid' };
  try {
    const data = JSON.parse(decodeBase64Url(token));
    if (!data || typeof data !== 'object' || !data.exp) {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
};

/**
 * Checks whether a decoded pass has expired or was revoked on this device.
 *
 * @param {object|null} data - Decoded pass payload.
 * @param {Set<string>|null} [revokedIds] - Locally revoked `jti` set.
 * @returns {boolean} True when the pass must be rejected.
 */
export const isPassExpired = (data, revokedIds) => {
  if (!data) return true;
  if (Date.now() > data.exp) return true;
  if (data.jti && revokedIds && revokedIds.has(data.jti)) return true;
  return false;
};

/**
 * Verifies an entered PIN against the stored hash.
 * Passes without a PIN always verify successfully.
 *
 * @async
 * @param {object|null} data - Decoded pass payload.
 * @param {string} pin - User supplied 4-digit PIN.
 * @returns {Promise<boolean>} True when the PIN matches (or is not required).
 */
export const verifyPin = async (data, pin) => {
  if (!data?.pinHash) return true;
  if (!pin) return false;
  const hash = await sha256Hex(`pin:${pin}`);
  return hash === data.pinHash;
};

/* ---------- Countdown ---------- */

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Formats remaining milliseconds as a localized `HH:MM:SS` countdown.
 *
 * @param {number} ms - Remaining milliseconds.
 * @returns {string} Persian-digit countdown string.
 */
export const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return toFaDigits(`${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`);
};

/**
 * Converts Western digits inside any value to Persian digits.
 *
 * @param {*} value - Input value.
 * @returns {string} Value with Persian digits.
 */
export const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
