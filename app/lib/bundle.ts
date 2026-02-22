// ============================================================================
// Prompt Chronicle — PRB Bundle Export/Import
// ============================================================================
// Handles .prb (Prompt Refinery Bundle) file creation and parsing.
// Supports optional gzip compression (via pako CDN) and AES-GCM encryption
// (via native crypto.subtle). Zero-build CDN-based — no npm imports.
// ============================================================================

import type { LibraryItem, PRBBundle, Collection, Tag } from './types';


// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** Full workspace payload serialized inside a .prb bundle. */
export interface BundlePayload {
  items: LibraryItem[];
  collections: Collection[];
  tags: Tag[];
}

/** Options for creating a bundle. */
export interface ExportOptions {
  compress?: boolean;
  encrypt?: boolean;
  password?: string;
}

/** Result of importing a bundle. */
export interface ImportResult {
  payload: BundlePayload;
  bundle: PRBBundle;
}


// ----------------------------------------------------------------------------
// Helpers — Base64 <-> ArrayBuffer
// ----------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}


// ----------------------------------------------------------------------------
// Helpers — Compression (pako via CDN or fallback)
// ----------------------------------------------------------------------------

let pakoModule: any = null;

async function getPako(): Promise<any> {
  if (pakoModule) return pakoModule;
  try {
    pakoModule = await import('https://esm.sh/pako@2.1.0');
    return pakoModule;
  } catch {
    return null;
  }
}

async function compressData(data: string): Promise<Uint8Array> {
  const pako = await getPako();
  if (pako) {
    const encoder = new TextEncoder();
    return pako.deflate(encoder.encode(data));
  }
  // Fallback: no compression, just encode to UTF-8
  return new TextEncoder().encode(data);
}

async function decompressData(data: Uint8Array): Promise<string> {
  const pako = await getPako();
  if (pako) {
    const inflated = pako.inflate(data);
    return new TextDecoder().decode(inflated);
  }
  return new TextDecoder().decode(data);
}


// ----------------------------------------------------------------------------
// Helpers — Encryption (AES-GCM via crypto.subtle)
// ----------------------------------------------------------------------------

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptData(
  data: Uint8Array,
  password: string,
): Promise<{ encrypted: ArrayBuffer; salt: Uint8Array; iv: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return { encrypted, salt, iv };
}

async function decryptData(
  data: ArrayBuffer,
  password: string,
  salt: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return new Uint8Array(decrypted);
}


// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

/**
 * Creates a .prb bundle from workspace data.
 *
 * Flow: JSON → compress (optional) → encrypt (optional) → base64 → PRBBundle JSON
 */
export async function createBundle(
  payload: BundlePayload,
  options: ExportOptions = {},
): Promise<string> {
  const { compress = true, encrypt = false, password } = options;

  const jsonStr = JSON.stringify(payload);

  // Step 1: Optionally compress
  let processed: Uint8Array;
  if (compress) {
    processed = await compressData(jsonStr);
  } else {
    processed = new TextEncoder().encode(jsonStr);
  }

  // Step 2: Optionally encrypt
  const bundle: PRBBundle = {
    version: '1.0',
    created: new Date().toISOString(),
    itemCount: payload.items.length,
    encrypted: false,
    compressed: compress,
    payload: '',
  };

  if (encrypt && password) {
    const { encrypted, salt, iv } = await encryptData(processed, password);
    bundle.encrypted = true;
    bundle.salt = arrayBufferToBase64(salt.buffer);
    bundle.iv = arrayBufferToBase64(iv.buffer);
    bundle.payload = arrayBufferToBase64(encrypted);
  } else {
    bundle.payload = arrayBufferToBase64(processed.buffer);
  }

  return JSON.stringify(bundle, null, 2);
}


// ----------------------------------------------------------------------------
// Import
// ----------------------------------------------------------------------------

/**
 * Parses a .prb bundle string back into workspace data.
 *
 * Flow: PRBBundle JSON → base64 decode → decrypt (if needed) → decompress → parse JSON
 */
export async function parseBundle(
  bundleJson: string,
  password?: string,
): Promise<ImportResult> {
  let bundle: PRBBundle;
  try {
    bundle = JSON.parse(bundleJson);
  } catch {
    throw new Error('Invalid bundle file: not valid JSON');
  }

  if (!bundle.version || !bundle.payload) {
    throw new Error('Invalid bundle file: missing required fields');
  }

  // Step 1: Base64 decode
  let data: Uint8Array;
  try {
    const raw = base64ToArrayBuffer(bundle.payload);
    data = new Uint8Array(raw);
  } catch {
    throw new Error('Invalid bundle file: corrupt payload');
  }

  // Step 2: Decrypt if needed
  if (bundle.encrypted) {
    if (!password) {
      throw new Error('This bundle is encrypted. Please provide a password.');
    }
    if (!bundle.salt || !bundle.iv) {
      throw new Error('Invalid encrypted bundle: missing salt or IV');
    }
    try {
      const salt = new Uint8Array(base64ToArrayBuffer(bundle.salt));
      const iv = new Uint8Array(base64ToArrayBuffer(bundle.iv));
      data = await decryptData(data.buffer, password, salt, iv);
    } catch {
      throw new Error('Decryption failed. Wrong password?');
    }
  }

  // Step 3: Decompress if needed
  let jsonStr: string;
  if (bundle.compressed) {
    try {
      jsonStr = await decompressData(data);
    } catch {
      throw new Error('Decompression failed. Bundle may be corrupt.');
    }
  } else {
    jsonStr = new TextDecoder().decode(data);
  }

  // Step 4: Parse payload
  let payload: BundlePayload;
  try {
    const parsed = JSON.parse(jsonStr);
    // Support both old format (raw array) and new format (object with items/collections/tags)
    if (Array.isArray(parsed)) {
      payload = { items: parsed, collections: [], tags: [] };
    } else {
      payload = {
        items: parsed.items || [],
        collections: parsed.collections || [],
        tags: parsed.tags || [],
      };
    }
  } catch {
    throw new Error('Invalid bundle payload: not valid JSON');
  }

  return { payload, bundle };
}


// ----------------------------------------------------------------------------
// File helpers
// ----------------------------------------------------------------------------

/** Triggers a browser download of a .prb file. */
export function downloadBundle(bundleJson: string, filename?: string): void {
  const blob = new Blob([bundleJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `prompt-chronicle-${new Date().toISOString().slice(0, 10)}.prb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Reads a File object as text. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
