import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Durable cache layer backed by AsyncStorage.
 *
 * In-memory caches (api.js) disappear on app restart. We need a second tier
 * so that when the user opens the app offline / on a bad network, we can
 * still hydrate the UI immediately from the last known-good payload instead
 * of flashing an error or an empty state.
 *
 * Keys are namespaced with CACHE_PREFIX so the cache can be cleared
 * wholesale on logout without nuking the auth token.
 */

const CACHE_PREFIX = 'spltr_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class OfflineStorage {
  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      const payload = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
    } catch (err) {
      if (__DEV__) console.warn('[OfflineStorage] set failed', key, err);
    }
  }

  async get(key, { allowStale = false } = {}) {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const { data, timestamp, ttl } = JSON.parse(raw);
      const age = Date.now() - timestamp;
      const isStale = age > (ttl ?? DEFAULT_TTL);

      // When offline, we prefer stale data over nothing. Callers opt in.
      if (isStale && !allowStale) return null;

      return { data, timestamp, isStale };
    } catch (err) {
      if (__DEV__) console.warn('[OfflineStorage] get failed', key, err);
      return null;
    }
  }

  async remove(key) {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (err) {
      if (__DEV__) console.warn('[OfflineStorage] remove failed', key, err);
    }
  }

  /** Clear everything in our namespace. Safe to call on logout. */
  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (ours.length > 0) {
        await AsyncStorage.multiRemove(ours);
      }
    } catch (err) {
      if (__DEV__) console.warn('[OfflineStorage] clear failed', err);
    }
  }
}

export const offlineStorage = new OfflineStorage();