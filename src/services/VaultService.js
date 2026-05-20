import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const KEY_NAME = 'calcmint_vault_key_v1';
const ENTRIES_STORE = '@fc_vault_entries_v1';

// CryptoJS's built-in WordArray.random falls back to Math.random in React Native
// because window.crypto.getRandomValues is unavailable, which throws
// "Native crypto module could not be used to get secure random number".
// Bridge to expo-crypto for real entropy.
function randomHex(byteLen) {
  const bytes = Crypto.getRandomBytes(byteLen);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

async function getOrCreateKey() {
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    key = randomHex(32); // 256-bit
    await SecureStore.setItemAsync(KEY_NAME, key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }
  return key;
}

function encryptString(plain, hexKey) {
  const keyBytes = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.enc.Hex.parse(randomHex(16));
  const enc = CryptoJS.AES.encrypt(plain, keyBytes, { iv });
  return iv.toString(CryptoJS.enc.Hex) + ':' + enc.toString();
}

function decryptString(cipher, hexKey) {
  const [ivHex, body] = cipher.split(':');
  if (!ivHex || !body) throw new Error('Corrupt vault payload.');
  const keyBytes = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const dec = CryptoJS.AES.decrypt(body, keyBytes, { iv });
  const text = dec.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Wrong key or corrupted entry.');
  return text;
}

async function readEnvelope() {
  const raw = await AsyncStorage.getItem(ENTRIES_STORE);
  return raw ? JSON.parse(raw) : { entries: [] };
}

async function writeEnvelope(env) {
  await AsyncStorage.setItem(ENTRIES_STORE, JSON.stringify(env));
}

const VaultService = {
  async list() {
    const env = await readEnvelope();
    const key = await getOrCreateKey();
    return env.entries.map((row) => {
      try {
        const plain = JSON.parse(decryptString(row.payload, key));
        return { id: row.id, type: row.type, updatedAt: row.updatedAt, ...plain };
      } catch (_) {
        return { id: row.id, type: row.type, updatedAt: row.updatedAt, _corrupt: true };
      }
    });
  },

  async upsert(entry) {
    const { id, type, ...fields } = entry;
    const env = await readEnvelope();
    const key = await getOrCreateKey();
    const now = new Date().toISOString();
    const payload = encryptString(JSON.stringify(fields), key);

    if (id) {
      env.entries = env.entries.map((r) =>
        r.id === id ? { ...r, type, payload, updatedAt: now } : r,
      );
    } else {
      const newId = Date.now().toString();
      env.entries.unshift({ id: newId, type, payload, updatedAt: now });
      await writeEnvelope(env);
      return newId;
    }
    await writeEnvelope(env);
    return id;
  },

  async remove(id) {
    const env = await readEnvelope();
    env.entries = env.entries.filter((r) => r.id !== id);
    await writeEnvelope(env);
  },

  async wipe() {
    await AsyncStorage.removeItem(ENTRIES_STORE);
    await SecureStore.deleteItemAsync(KEY_NAME);
  },
};

export default VaultService;
