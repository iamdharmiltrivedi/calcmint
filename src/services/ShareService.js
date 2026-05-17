import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const ShareService = {
  async shareCard(ref) {
    if (!ref?.current) return;
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share via',
        UTI: 'public.png',
      });
    }
    return uri;
  },
};

export default ShareService;
