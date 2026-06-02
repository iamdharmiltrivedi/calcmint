import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

const IMAGE_MIME_RE = /^image\//i;
const PDF_MIME_RE = /pdf/i;

function extFromName(name) {
  if (!name || typeof name !== 'string') return '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

// Optional native module — only present in a dev / EAS build. Wrap the require
// so the JS bundle still runs in Expo Go (the call will throw at runtime instead).
let DocumentScanner = null;
try {
  // eslint-disable-next-line global-require
  DocumentScanner = require('react-native-document-scanner-plugin').default;
} catch (_) {
  DocumentScanner = null;
}

const RECEIPTS_DIR = `${FileSystem.documentDirectory}receipts/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
}

async function compress(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

const ReceiptService = {
  isScannerAvailable() {
    return DocumentScanner != null;
  },

  // Native document scanner. Returns the FIRST scanned page URI, or null if cancelled.
  // Throws an Error with a friendly message when the scanner isn't available on this device/build.
  async scanDocument() {
    if (!DocumentScanner) {
      throw new Error('Scanner is only available in a dev/EAS build. Run "eas build" to enable it.');
    }
    try {
      const result = await DocumentScanner.scanDocument({
        croppedImageQuality: 80,
        // On Android the user can scan multiple pages; we take the first.
        // On iOS this is also a multi-page session.
        responseType: 'imageFilePath',
      });
      const images = result?.scannedImages || [];
      if (images.length === 0) return null;
      return images[0];
    } catch (e) {
      // Android sometimes raises "scanner not installed" — surface a kinder message.
      const msg = (e && e.message) || '';
      if (/not available|google play|install/i.test(msg)) {
        throw new Error('Document scanner needs Google Play Services on Android. Try "Take photo" instead.');
      }
      throw e;
    }
  },

  async pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission denied.');
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled) return null;
    return res.assets?.[0]?.uri || null;
  },

  async pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo library permission denied.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled) return null;
    return res.assets?.[0]?.uri || null;
  },

  // System file picker — accepts PDFs, images, and any other file the user chooses.
  // Returns { uri, name, mimeType } or null when cancelled.
  async pickFromFiles() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return null;
    const asset = res.assets?.[0];
    if (!asset?.uri) return null;
    return {
      uri: asset.uri,
      name: asset.name || 'document',
      mimeType: asset.mimeType || '',
    };
  },

  isImageMime(mime) {
    return IMAGE_MIME_RE.test(mime || '');
  },

  isPdfMime(mime, name) {
    return PDF_MIME_RE.test(mime || '') || extFromName(name) === 'pdf';
  },

  async saveImage(srcUri, id) {
    await ensureDir();
    const compressed = await compress(srcUri);
    const dest = `${RECEIPTS_DIR}${id}.jpg`;
    await FileSystem.copyAsync({ from: compressed, to: dest });
    return dest;
  },

  // Save a non-image file (PDF, docx, etc.) as-is, keeping the original extension.
  async saveFile(srcUri, id, name) {
    await ensureDir();
    const ext = extFromName(name) || 'bin';
    const dest = `${RECEIPTS_DIR}${id}.${ext}`;
    await FileSystem.copyAsync({ from: srcUri, to: dest });
    return dest;
  },

  async openExternally(uri, mimeType) {
    if (!uri) throw new Error('No file to open.');
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing is not available on this device.');
    }
    await Sharing.shareAsync(uri, mimeType ? { mimeType } : undefined);
  },

  async deleteImage(uri) {
    if (!uri) return;
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch (_) {}
  },
};

export default ReceiptService;
