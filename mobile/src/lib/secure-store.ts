import * as ExpoSecureStore from 'expo-secure-store';

export const SecureStore = {
  get(key: string): Promise<string | null> {
    return ExpoSecureStore.getItemAsync(key);
  },

  set(key: string, value: string): Promise<void> {
    return ExpoSecureStore.setItemAsync(key, value);
  },

  delete(key: string): Promise<void> {
    return ExpoSecureStore.deleteItemAsync(key);
  },
} as const;
