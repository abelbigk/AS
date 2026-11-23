import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpcVanillaClient } from "../lib/trpcVanillaClient";

export interface CoordinatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
}

interface TrackingStationaryState {
  lastRecordedCoord: { latitude: number; longitude: number } | null;
  stationarySince: number | null; // epoch ms
  hasRecordedStationary: boolean;
}

const STORAGE_KEY_STATE = "@tracking_stationary_state";
const STORAGE_KEY_QUEUE = "@tracking_offline_queue";

// In-memory cache for ultra-fast checks during high frequency background updates
let memoryState: TrackingStationaryState | null = null;

export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const φ1 = lat1 * rad;
  const φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad;
  const Δλ = (lon2 - lon1) * rad;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function loadState(): Promise<TrackingStationaryState> {
  if (memoryState) return memoryState;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STATE);
    if (raw) {
      memoryState = JSON.parse(raw);
      return memoryState!;
    }
  } catch (e) {
    // Fallback to default
  }
  memoryState = {
    lastRecordedCoord: null,
    stationarySince: null,
    hasRecordedStationary: false,
  };
  return memoryState;
}

async function saveState(state: TrackingStationaryState): Promise<void> {
  memoryState = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Evaluates the 10-meter movement and 1-minute stationary rule:
 * - If moved >= 10 meters: records immediately.
 * - If moved < 10 meters: skips recording until stationary for 1 minute.
 * - Once stationary for 1 minute: records the exact coordinate once, and stays on it until moving >= 10 meters again.
 */
export async function shouldRecordCoordinate(coord: {
  latitude: number;
  longitude: number;
}): Promise<boolean> {
  const state = await loadState();
  const now = Date.now();

  // 1. Initial coordinate
  if (!state.lastRecordedCoord) {
    state.lastRecordedCoord = {
      latitude: coord.latitude,
      longitude: coord.longitude,
    };
    state.stationarySince = now;
    state.hasRecordedStationary = false;
    await saveState(state);
    return true;
  }

  // Calculate distance from last recorded point
  const distance = getDistanceMeters(
    coord.latitude,
    coord.longitude,
    state.lastRecordedCoord.latitude,
    state.lastRecordedCoord.longitude
  );

  // 2. Moved >= 10 meters
  if (distance >= 10) {
    state.lastRecordedCoord = {
      latitude: coord.latitude,
      longitude: coord.longitude,
    };
    state.stationarySince = now;
    state.hasRecordedStationary = false;
    await saveState(state);
    return true;
  }

  // 3. Movement < 10 meters (stationary)
  if (!state.stationarySince) {
    state.stationarySince = now;
  }
  const stationaryDuration = now - state.stationarySince;

  // If stationary for >= 1 minute (60,000 ms) and not yet recorded the stationary position
  if (stationaryDuration >= 60000 && !state.hasRecordedStationary) {
    state.lastRecordedCoord = {
      latitude: coord.latitude,
      longitude: coord.longitude,
    };
    state.hasRecordedStationary = true;
    await saveState(state);
    return true;
  }

  // Save current stationarySince timer and stay on existing coordinate without recording
  await saveState(state);
  return false;
}

/**
 * Enqueues coordinate payload when device is offline
 */
async function enqueueOfflineCoordinate(
  payload: CoordinatePayload
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
    const queue: CoordinatePayload[] = raw ? JSON.parse(raw) : [];
    // Limit queue size to last 500 points to prevent storage bloating
    if (queue.length >= 500) {
      queue.shift();
    }
    queue.push(payload);
    await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error("[TrackingEngine] Failed to enqueue offline point:", e);
  }
}

/**
 * Flushes offline queued coordinates when back online
 */
export async function flushOfflineQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
    if (!raw) return;
    const queue: CoordinatePayload[] = JSON.parse(raw);
    if (!queue || queue.length === 0) return;

    // Send buffered points in order
    const remaining: CoordinatePayload[] = [];
    for (const item of queue) {
      try {
        await trpcVanillaClient.tracking.ping.mutate(item);
      } catch (err) {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
    }
  } catch (e) {
    console.error("[TrackingEngine] Failed to flush offline queue:", e);
  }
}

/**
 * Primary processor: filters out inaccurate cellular fixes, prevents jitter when stationary,
 * and transmits every 10s to the server.
 */
export async function processAndSendCoordinate(
  payload: CoordinatePayload
): Promise<boolean> {
  try {
    // 1. Discard coarse/inaccurate fixes (e.g. cellular/wifi triangulation > 20m)
    // Only accept high-precision GPS fixes (<= 20m) so cell tower jumps NEVER pollute the map
    if (payload.accuracy != null && payload.accuracy > 20) {
      return false;
    }

    const state = await loadState();
    const now = Date.now();

    if (!state.lastRecordedCoord) {
      // First fix: set stationary anchor
      state.lastRecordedCoord = {
        latitude: payload.latitude,
        longitude: payload.longitude,
      };
      state.stationarySince = now;
      state.hasRecordedStationary = false;
      await saveState(state);
    } else {
      const distance = getDistanceMeters(
        payload.latitude,
        payload.longitude,
        state.lastRecordedCoord.latitude,
        state.lastRecordedCoord.longitude
      );

      if (distance >= 10) {
        // True physical movement >= 10 meters! Move anchor to new position
        state.lastRecordedCoord = {
          latitude: payload.latitude,
          longitude: payload.longitude,
        };
        state.stationarySince = now;
        state.hasRecordedStationary = false;
        await saveState(state);
      } else {
        // Stationary (< 10m from anchor): snap coordinates to the anchor
        // so natural GPS signal jitter (±2m) doesn't draw spiderwebs while sitting in the house
        payload.latitude = state.lastRecordedCoord.latitude;
        payload.longitude = state.lastRecordedCoord.longitude;
        payload.speed = 0;
      }
    }

    // 2. Transmit to server every 10 seconds!
    try {
      await trpcVanillaClient.tracking.ping.mutate(payload);
      flushOfflineQueue().catch(() => {});
      return true;
    } catch (networkErr) {
      await enqueueOfflineCoordinate(payload);
      return false;
    }
  } catch (err) {
    console.error("[TrackingEngine] Error processing coordinate:", err);
    return false;
  }
}

/**
 * Resets tracking state on logout
 */
export async function clearTrackingState(): Promise<void> {
  memoryState = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_STATE);
    await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
  } catch (e) {}
}
