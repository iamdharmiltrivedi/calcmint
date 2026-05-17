import * as LocalAuthentication from 'expo-local-authentication';

const BiometricService = {
  async capability() {
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let label = 'Biometric';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) label = 'Face ID';
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) label = 'Fingerprint';
      else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) label = 'Iris';
      return { available: !!(hardware && enrolled), label };
    } catch (_) {
      return { available: false, label: 'Biometric' };
    }
  },

  async authenticate(reason = 'Unlock CalcMint Vault') {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use PIN',
      });
      return { success: !!res.success, error: res.error };
    } catch (e) {
      return { success: false, error: e?.message };
    }
  },
};

export default BiometricService;
