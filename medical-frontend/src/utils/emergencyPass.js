/**
 * ابزار دسترسی اضطراری موقت (Emergency / Temporary QR Pass)
 *
 * توکن به صورت کاملا سمت کلاینت ساخته می‌شود:
 * ساختار payload شامل خلاصه پروفایل + اسنپ‌شات آزمایش‌های تایید شده
 * + زمان انقضا + هش PIN اختیاری است که Base64URL انکود می‌شود.
 *
 * نکته امنیتی: برای اعتبارسنجی متمرکز و لغو سراسری، در آینده می‌توان
 * build/resolve این ماژول را با endpoint بک‌اند جایگزین کرد.
 */

const ACTIVE_KEY = 'salamatyar_emergency_passes';
const REVOKED_KEY = 'salamatyar_revoked_jtis';

export const DURATIONS = [
  { value: '1', label: '۱ ساعت' },
  { value: '6', label: '۶ ساعت' },
  { value: '24', label: '۲۴ ساعت' },
  { value: '48', label: '۴۸ ساعت' },
];

/* ---------- Hashing ---------- */

const fallbackHash = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv:${hash.toString(16)}:${text.length}`;
};

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
    /* fall through */
  }
  return fallbackHash(text);
};

/* ---------- Base64URL (UTF-8 safe) ---------- */

const encodeBase64Url = (json) => {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeBase64Url = (token) => {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

/* ---------- Local registries ---------- */

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export const getRevokedIds = () => new Set(readJson(REVOKED_KEY, []));

export const revokePass = (jti) => {
  const revoked = getRevokedIds();
  revoked.add(jti);
  writeJson(REVOKED_KEY, [...revoked]);
  writeJson(ACTIVE_KEY, readJson(ACTIVE_KEY, []).filter((p) => p && p.jti !== jti));
};

export const getActivePasses = () => {
  const now = Date.now();
  const revoked = getRevokedIds();
  return readJson(ACTIVE_KEY, [])
    .filter((pass) => pass && pass.expiresAt > now && !revoked.has(pass.jti))
    .sort((a, b) => b.expiresAt - a.expiresAt);
};

export const saveActivePass = (record) => {
  const list = [record, ...getActivePasses()].slice(0, 5);
  writeJson(ACTIVE_KEY, list);
};

/* ---------- Build & Resolve ---------- */

export const buildEmergencyPass = async ({ profile, tests, durationHours, pin }) => {
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
    bg: profile?.blood_group || null,
    al: profile?.allergies || null,
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

export const isPassExpired = (data, revokedIds) => {
  if (!data) return true;
  if (Date.now() > data.exp) return true;
  if (data.jti && revokedIds && revokedIds.has(data.jti)) return true;
  return false;
};

export const verifyPin = async (data, pin) => {
  if (!data?.pinHash) return true;
  if (!pin) return false;
  const hash = await sha256Hex(`pin:${pin}`);
  return hash === data.pinHash;
};

/* ---------- Countdown ---------- */

const pad2 = (n) => String(n).padStart(2, '0');

export const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return toFaDigits(`${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`);
};

export const toFaDigits = (value) =>
  String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
