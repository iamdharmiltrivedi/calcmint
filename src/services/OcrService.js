// On-device OCR via @react-native-ml-kit/text-recognition.
// iOS: Apple Vision framework. Android: Google ML Kit Text Recognition.
// Both run offline once the model is downloaded (Android may fetch the model
// on first use via Play Services).
let TextRecognition = null;
try {
  // eslint-disable-next-line global-require
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (_) {
  TextRecognition = null;
}

const OcrService = {
  isAvailable() {
    return TextRecognition != null;
  },

  // Returns the full recognised text (lines joined by \n) or '' on failure.
  async recognize(imageUri) {
    if (!TextRecognition || !imageUri) return '';
    try {
      const result = await TextRecognition.recognize(imageUri);
      // `result.text` is the combined string; `result.blocks` has per-block frames.
      return result?.text || '';
    } catch (e) {
      // Never throw — OCR is best-effort. Caller handles empty.
      console.warn('[OCR] recognize failed:', e?.message);
      return '';
    }
  },
};

export default OcrService;
