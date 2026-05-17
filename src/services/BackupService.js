import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import CryptoJS from 'crypto-js';

const BACKUP_VERSION = 1;
const APP_ID = 'CalcMint';

// Keys we include in a backup. Anything starting with @fc_ is app-owned.
const BACKUP_KEY_PREFIX = '@fc_';

async function snapshot() {
  const allKeys = await AsyncStorage.getAllKeys();
  const ours = allKeys.filter((k) => k.startsWith(BACKUP_KEY_PREFIX));
  const pairs = await AsyncStorage.multiGet(ours);
  const data = {};
  for (const [k, v] of pairs) {
    if (v != null) data[k] = v; // store raw strings to avoid re-encoding
  }
  return data;
}

async function restoreSnapshot(data) {
  if (!data || typeof data !== 'object') throw new Error('Backup payload is empty.');
  const entries = Object.entries(data).filter(([k]) => k.startsWith(BACKUP_KEY_PREFIX));
  if (entries.length === 0) throw new Error('Backup is empty.');

  // Clear current app data first, then write the new state.
  const allKeys = await AsyncStorage.getAllKeys();
  const ours = allKeys.filter((k) => k.startsWith(BACKUP_KEY_PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
  await AsyncStorage.multiSet(entries);
}

function encrypt(payload, passphrase) {
  const text = JSON.stringify(payload);
  return CryptoJS.AES.encrypt(text, passphrase).toString();
}

function decrypt(cipher, passphrase) {
  const bytes = CryptoJS.AES.decrypt(cipher, passphrase);
  const text = bytes.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Wrong passphrase or corrupted backup.');
  return JSON.parse(text);
}

const BackupService = {
  async exportEncrypted(passphrase) {
    if (!passphrase || passphrase.length < 4) throw new Error('Passphrase must be at least 4 characters.');
    const data = await snapshot();
    const envelope = {
      app: APP_ID,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data,
    };
    const cipher = encrypt(envelope, passphrase);

    const dir = FileSystem.cacheDirectory;
    const fname = `calcmint-backup-${new Date().toISOString().slice(0, 10)}.calcmint`;
    const uri = `${dir}${fname}`;
    await FileSystem.writeAsStringAsync(uri, cipher, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'CalcMint backup',
        UTI: 'public.data',
      });
    }
    return { uri, fname };
  },

  async importEncrypted(passphrase) {
    if (!passphrase) throw new Error('Enter your backup passphrase.');
    const picked = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      // Accept anything — backup files don't have a registered mime.
    });
    if (picked.canceled) return { canceled: true };
    const asset = picked.assets?.[0];
    if (!asset?.uri) throw new Error('Could not read the selected file.');

    const cipher = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
    const envelope = decrypt(cipher, passphrase);

    if (envelope.app !== APP_ID) throw new Error('Not a CalcMint backup.');
    if (envelope.version > BACKUP_VERSION) {
      throw new Error('Backup was created by a newer version. Update the app and try again.');
    }
    await restoreSnapshot(envelope.data);
    return { canceled: false, createdAt: envelope.createdAt };
  },
};

export default BackupService;
