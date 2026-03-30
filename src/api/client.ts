// Instance Jellyfin SDK — point d'entrée unique pour toutes les requêtes API
import { Jellyfin } from '@jellyfin/sdk';
import { Platform } from 'react-native';

const CLIENT_NAME = 'JellyStream';
const CLIENT_VERSION = '0.1.0';

// Identifiant device persistant — ne pas utiliser Date.now() qui change à chaque reload
function getPersistedDeviceId(): string {
  const key = 'jellystream_device_id';
  if (Platform.OS === 'web') {
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = `jellystream-web-${crypto.randomUUID()}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'jellystream-web-fallback';
    }
  }
  // Sur native, on utilise un ID stable basé sur la plateforme
  // MMKV sera chargé dynamiquement si disponible
  try {
    const { MMKV } = require('react-native-mmkv');
    const storage = new MMKV({ id: 'jellystream-device' });
    let id = storage.getString(key);
    if (!id) {
      id = `jellystream-${Platform.OS}-${Math.random().toString(36).substring(2)}`;
      storage.set(key, id);
    }
    return id;
  } catch {
    return `jellystream-${Platform.OS}-stable`;
  }
}

const deviceName = `${Platform.OS} ${Platform.Version}`;
const deviceId = getPersistedDeviceId();

export const jellyfin = new Jellyfin({
  clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
  deviceInfo: { name: deviceName, id: deviceId },
});

// Crée une instance API connectée à un serveur
export function createApiClient(serverUrl: string) {
  return jellyfin.createApi(serverUrl);
}
