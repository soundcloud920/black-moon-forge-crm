const SECURE_UNLOCK_KEY = "bmf-secure-unlock-v1";
const INNER_SESSION_KEY = "bmf-crm-session-v1";
const DEVICE_KEY = "bmf-crm-device-v1";

const unlockForm = document.querySelector("#unlockForm");
const unlockError = document.querySelector("#unlockError");

bootSecureShell();

unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  unlockError.textContent = "";

  const form = new FormData(unlockForm);
  const login = normalizeLogin(form.get("login"));
  const password = String(form.get("password") || "");
  const remember = Boolean(form.get("remember"));

  try {
    const result = await unlockPayload(login, password);
    if (!result) {
      unlockError.textContent = "Логин или пароль не подходят.";
      return;
    }

    const session = makeSession(result.accountId, login);
    const unlocked = { accountId: result.accountId, payload: result.payload, session, payloadBuild: currentPayloadBuild() };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SECURE_UNLOCK_KEY, JSON.stringify(unlocked));
    mountApp(unlocked);
  } catch {
    unlockError.textContent = "Не удалось открыть CRM.";
  }
});

function bootSecureShell() {
  const saved = readUnlock();
  if (saved?.payload && saved?.session) {
    mountApp(saved);
  }
}

function readUnlock() {
  const raw = localStorage.getItem(SECURE_UNLOCK_KEY) || sessionStorage.getItem(SECURE_UNLOCK_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (saved.payloadBuild !== currentPayloadBuild()) {
      localStorage.removeItem(SECURE_UNLOCK_KEY);
      sessionStorage.removeItem(SECURE_UNLOCK_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

async function unlockPayload(login, password) {
  const envelopes = window.BMF_SECURE_PAYLOAD?.envelopes || [];

  for (const envelope of envelopes) {
    try {
      const key = await deriveKey(login, password, envelope);
      const payloadText = await decryptEnvelope(key, envelope);
      const payload = JSON.parse(payloadText);
      if (payload?.version === 1 && payload.html && payload.css && payload.js) {
        return { accountId: envelope.id || "member", payload };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function deriveKey(login, password, envelope) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${login}\n${password}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(envelope.salt),
      iterations: envelope.iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptEnvelope(key, envelope) {
  const ciphertext = base64ToBytes(envelope.data);
  const tag = base64ToBytes(envelope.tag);
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext, 0);
  sealed.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv), tagLength: 128 },
    key,
    sealed,
  );
  return new TextDecoder().decode(decrypted);
}

function mountApp(unlocked) {
  localStorage.setItem(INNER_SESSION_KEY, JSON.stringify(unlocked.session));
  window.BMF_SESSION = unlocked.session;

  const style = document.createElement("style");
  style.textContent = unlocked.payload.css;
  document.head.append(style);

  document.body.innerHTML = unlocked.payload.html;
  new Function(unlocked.payload.js)();
}

function makeSession(userId, login) {
  return {
    userId,
    login,
    deviceId: getDeviceId(),
    signedAt: new Date().toISOString(),
  };
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeLogin(value) {
  return String(value || "").trim().toLowerCase();
}

function currentPayloadBuild() {
  return String(window.BMF_SECURE_PAYLOAD?.buildId || "");
}
