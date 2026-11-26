import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Location from "expo-location";
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

interface PendingDeparture {
  latitude: number;
  longitude: number;
  timestampMs: number;
  distFromAnchor: number;
}

interface TrackingStationaryState {
  lastRecordedCoord: { latitude: number; longitude: number } | null;
  lastRecordedTimestamp?: number | null;
  lastRecordedAccuracy?: number | null;
  lastSeenTimestamp?: number | null;
  lastStationaryUpdateMs?: number | null;
  stationaryAnchor: { latitude: number; longitude: number } | null;
  stationarySince: number | null; // epoch ms
  hasRecordedStationary: boolean;
  pendingDeparture?: PendingDeparture | null;
  kalmanLat?: number | null;
  kalmanLng?: number | null;
  kalmanVariance?: number | null;
  kalmanTimestampMs?: number | null;
}

const STORAGE_KEY_STATE = "@tracking_stationary_state";
const STORAGE_KEY_QUEUE = "@tracking_offline_queue";
const TRAIL_INTERVAL_MS = 10000; // Offline mode: leave a trail point every 10s while moving
const STATIONARY_REFINE_INTERVAL_MS = 300000; // Check every 5 mins when stationary to refine position
const PING_TIMEOUT_MS = 7000;
const HEARTBEAT_INTERVAL_MS = 1000; // Stream live online presence & heading every 1s when moving
const HEARTBEAT_IDLE_INTERVAL_MS = 5000; // Keep-alive every 5s when stationary & heading unchanged

let lastHeartbeatSentMs = 0;
let lastHeartbeatPayload: CoordinatePayload | null = null;
let heartbeatInFlight = false;
let isDeviceOnline = true; // Updated by heartbeat & ping network results
let cachedLocationEnabled: boolean = true; // Updated before every heartbeat send

function hasSignificantHeartbeatChange(prev: CoordinatePayload | null, next: CoordinatePayload): boolean {
  if (!prev) return true;
  const moved = getDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
  if (moved >= 1.5) return true;
  const h1 = prev.heading ?? 0;
  const h2 = next.heading ?? 0;
  const rawDiff = Math.abs(h1 - h2) % 360;
  const headingDiff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
  if (headingDiff >= 5) return true;
  if (Math.abs((prev.speed ?? 0) - (next.speed ?? 0)) >= 0.3) return true;
  return false;
}

function sendLiveHeartbeatThrottled(payload: CoordinatePayload, nowMs: number): void {
  if (heartbeatInFlight) return;
  const elapsed = nowMs - lastHeartbeatSentMs;
  const minInterval = hasSignificantHeartbeatChange(lastHeartbeatPayload, payload)
    ? HEARTBEAT_INTERVAL_MS
    : HEARTBEAT_IDLE_INTERVAL_MS;
  if (elapsed < minInterval) return;
  lastHeartbeatSentMs = nowMs;
  lastHeartbeatPayload = payload;
  heartbeatInFlight = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Snapshot locationEnabled at send time (async check would be stale by the time we send)
  const locEnabled = cachedLocationEnabled;
  Promise.race([
    trpcVanillaClient.tracking.liveHeartbeat.mutate({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy ?? null,
      speed: payload.speed ?? null,
      heading: payload.heading ?? null,
      timestamp: payload.timestamp,
      locationEnabled: locEnabled,
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Heartbeat timeout")), 3000);
    }),
  ])
    .then(() => {
      isDeviceOnline = true;
    })
    .catch(() => {
      isDeviceOnline = false;
    })
    .finally(() => {
      heartbeatInFlight = false;
      if (timer) clearTimeout(timer);
    });
}

async function sendPingWithTimeout(payload: CoordinatePayload): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      trpcVanillaClient.tracking.ping.mutate(payload),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Ping timeout")), PING_TIMEOUT_MS);
      }),
    ]);
    isDeviceOnline = true;
  } catch (err) {
    isDeviceOnline = false;
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// In-memory cache for ultra-fast checks during high frequency background updates
let memoryState: TrackingStationaryState | null = null;
// Serializes foreground + background location task calls so state never races
let processingChain: Promise<boolean> = Promise.resolve(false);
let flushPromise: Promise<void> | null = null;
let lastFlushAttemptMs = 0;

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
    stationaryAnchor: null,
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
    // Support up to 5,000 queued points (6-12+ hours of continuous offline travel)
    if (queue.length >= 5000) {
      queue.splice(0, queue.length - 4999);
    }
    queue.push(payload);
    await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error("[TrackingEngine] Failed to enqueue offline point:", e);
  }
}

/**
 * Flushes offline queued coordinates when back online.
 * Guarded by flushPromise so concurrent callers never duplicate-send points.
 */
export function flushOfflineQueue(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
      if (!raw) return;
      let queue: CoordinatePayload[] = JSON.parse(raw);
      if (!queue || queue.length === 0) return;

      const BATCH_SIZE = 10;
      let idx = 0;
      const failedItems: CoordinatePayload[] = [];

      while (idx < queue.length) {
        const batch = queue.slice(idx, idx + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((item) => trpcVanillaClient.tracking.ping.mutate(item))
        );

        let anySucceeded = false;
        for (let i = 0; i < results.length; i++) {
          if (results[i].status === "fulfilled") {
            anySucceeded = true;
          } else {
            failedItems.push(batch[i]);
          }
        }

        idx += batch.length;

        // If the entire batch failed, device is still offline — stop immediately & preserve remaining tail
        if (!anySucceeded) {
          const unsentTail = queue.slice(idx);
          const remaining = [...failedItems, ...unsentTail];
          await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));
          return;
        }
      }

      if (failedItems.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(failedItems));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
      }
    } catch (e) {
      console.error("[TrackingEngine] Failed to flush offline queue:", e);
    } finally {
      flushPromise = null;
    }
  })();
  return flushPromise;
}

export function setLocationServicesEnabled(enabled: boolean): void {
  cachedLocationEnabled = enabled;
}

export function pingLivePresenceFromBackground(fallbackLat?: number, fallbackLng?: number): void {
  const nowMs = Date.now();
  const base = lastHeartbeatPayload;
  if (base) {
    sendLiveHeartbeatThrottled(
      {
        ...base,
        timestamp: new Date(nowMs + 3 * 3600 * 1000).toISOString().replace("Z", "+03:00"),
      },
      nowMs
    );
  } else if (fallbackLat != null && fallbackLng != null) {
    sendLiveHeartbeatThrottled(
      {
        latitude: fallbackLat,
        longitude: fallbackLng,
        timestamp: new Date(nowMs + 3 * 3600 * 1000).toISOString().replace("Z", "+03:00"),
      },
      nowMs
    );
  }
}

export function updateLiveCompassHeading(headingDeg: number): void {
  if (!lastHeartbeatPayload || Number.isNaN(headingDeg) || headingDeg < 0) return;
  const nowMs = Date.now();
  const updated: CoordinatePayload = {
    ...lastHeartbeatPayload,
    heading: headingDeg,
    timestamp: new Date(nowMs + 3 * 3600 * 1000).toISOString().replace("Z", "+03:00"),
  };
  sendLiveHeartbeatThrottled(updated, nowMs);
}

/**
 * Primary processor: filters out inaccurate cellular fixes, prevents jitter when stationary,
 * and transmits every 10s to the server. Serialized via processingChain so foreground & background
 * location callbacks never race.
 */
export function processAndSendCoordinate(
  payload: CoordinatePayload
): Promise<boolean> {
  const next = processingChain.then(
    () => processAndSendCoordinateInner(payload),
    () => processAndSendCoordinateInner(payload)
  );
  processingChain = next;
  return next;
}

async function processAndSendCoordinateInner(
  payload: CoordinatePayload
): Promise<boolean> {
  try {
    // 1. Allow live heartbeats up to 65m accuracy (so indoor live avatar keeps streaming),
    // but discard coarse fixes (> 20m) from permanent DB history below.
    if (payload.accuracy != null && payload.accuracy > 65) {
      return false;
    }

    const state = await loadState();
    const now = Date.now();
    const payloadMs = Date.parse(payload.timestamp) || now;

    // Deduplicate identical or out-of-order cached OS location fixes for DB recording,
    // but still stream live presence heartbeat when online so background green avatar stays live.
    if (state.lastSeenTimestamp != null && payloadMs <= state.lastSeenTimestamp) {
      pingLivePresenceFromBackground(payload.latitude, payload.longitude);
      return false;
    }
    state.lastSeenTimestamp = payloadMs;

    // Periodically flush offline backlog even while stationary so a 6h offline trip uploads once back online
    if (now - lastFlushAttemptMs >= 30000) {
      lastFlushAttemptMs = now;
      flushOfflineQueue().catch(() => {});
    }

    // 2D GPS Kalman smoothing (smooths indoor jitter while tracking fast driving with zero lag)
    const accMeters = Math.max(payload.accuracy ?? 10, 3);
    const measVariance = accMeters * accMeters;
    const speedQ = payload.speed != null && payload.speed >= 1 ? Math.max(3, payload.speed) : 0.5;
    const dtKalman = state.kalmanTimestampMs != null ? (payloadMs - state.kalmanTimestampMs) / 1000 : 999;

    if (
      state.kalmanLat == null ||
      state.kalmanLng == null ||
      state.kalmanVariance == null ||
      dtKalman > 60 ||
      dtKalman < 0
    ) {
      state.kalmanLat = payload.latitude;
      state.kalmanLng = payload.longitude;
      state.kalmanVariance = measVariance;
      state.kalmanTimestampMs = payloadMs;
    } else {
      const predictedVariance = state.kalmanVariance + dtKalman * speedQ * speedQ;
      const gain = predictedVariance / (predictedVariance + measVariance);
      state.kalmanLat = state.kalmanLat + gain * (payload.latitude - state.kalmanLat);
      state.kalmanLng = state.kalmanLng + gain * (payload.longitude - state.kalmanLng);
      state.kalmanVariance = (1 - gain) * predictedVariance;
      state.kalmanTimestampMs = payloadMs;
    }

    const smoothedLat = state.kalmanLat;
    const smoothedLng = state.kalmanLng;
    const smoothedPayload: CoordinatePayload = {
      ...payload,
      latitude: smoothedLat,
      longitude: smoothedLng,
    };

    // Stream live presence + heading + live wandering position every 1s (in-memory only, no DB write)
    sendLiveHeartbeatThrottled(smoothedPayload, now);

    // Only record permanent DB points for high-precision GPS fixes (<= 20m)
    if (payload.accuracy != null && payload.accuracy > 20) {
      await saveState(state);
      return false;
    }

    // Human walking speed is ~1.2 to 1.5 m/s. Null/-1 or < 0.6 m/s means device reports stationary.
    const isStationarySpeed = payload.speed == null || payload.speed < 0.6;

    if (!state.lastRecordedCoord) {
      // First fix: set stationary anchor and record initial position
      state.lastRecordedCoord = {
        latitude: smoothedLat,
        longitude: smoothedLng,
      };
      state.lastRecordedTimestamp = payloadMs;
      state.lastRecordedAccuracy = payload.accuracy ?? null;
      state.lastStationaryUpdateMs = payloadMs;
      state.stationaryAnchor = {
        latitude: smoothedLat,
        longitude: smoothedLng,
      };
      state.stationarySince = now;
      state.hasRecordedStationary = true;
      state.pendingDeparture = null;
      await saveState(state);

      try {
        await sendPingWithTimeout(smoothedPayload);
        flushOfflineQueue().catch(() => {});
        return true;
      } catch (networkErr) {
        await enqueueOfflineCoordinate(smoothedPayload);
        return false;
      }
    }

    const distFromLast = getDistanceMeters(
      smoothedLat,
      smoothedLng,
      state.lastRecordedCoord.latitude,
      state.lastRecordedCoord.longitude
    );

    // Reject only genuinely impossible teleport jumps (> 55 m/s ≈ 200 km/h); allows fast driving (e.g. 50m-300m in 10s)
    if (state.lastRecordedTimestamp != null && distFromLast > 120) {
      const dtSec = Math.max(1, (payloadMs - state.lastRecordedTimestamp) / 1000);
      const impliedSpeed = distFromLast / dtSec;
      if (impliedSpeed > 55) {
        await saveState(state);
        return false;
      }
    }

    // 2. Online vs Offline movement & stationary rules
    if (isDeviceOnline) {
      // ONLINE MODE:
      // - Live green drop already shows wandering & turning in real time (no DB write).
      // - Stepping >= 10m from lastRecordedCoord (confirmed by speed >= 0.6 or 2 consecutive fixes >= 10m) writes to DB.
      // - If stationary and previous fix was blurry (> 12m), require > lastRecordedAccuracy before breaking away.
      // - Every 5 minutes while stationary, refine exact position if shifted >= 2m.
      const isMovingOutward =
        !!state.pendingDeparture &&
        payloadMs - state.pendingDeparture.timestampMs <= 90000 &&
        distFromLast >= state.pendingDeparture.distFromAnchor + 3;
      const onlineStepThreshold =
        isStationarySpeed && !isMovingOutward && (state.lastRecordedAccuracy ?? 0) > 12
          ? Math.max(10, state.lastRecordedAccuracy ?? 10)
          : 10;
      if (distFromLast < onlineStepThreshold) {
        state.pendingDeparture = null;
        const lastStatMs = state.lastStationaryUpdateMs ?? state.lastRecordedTimestamp ?? payloadMs;
        if (isStationarySpeed && payloadMs - lastStatMs >= STATIONARY_REFINE_INTERVAL_MS) {
          state.lastStationaryUpdateMs = payloadMs;
          if (distFromLast >= 2) {
            state.lastRecordedCoord = { latitude: smoothedLat, longitude: smoothedLng };
            state.lastRecordedTimestamp = payloadMs;
            state.lastRecordedAccuracy = payload.accuracy ?? null;
            state.stationaryAnchor = { latitude: smoothedLat, longitude: smoothedLng };
            await saveState(state);
            try {
              await sendPingWithTimeout(smoothedPayload);
              flushOfflineQueue().catch(() => {});
              return true;
            } catch (networkErr) {
              await enqueueOfflineCoordinate(smoothedPayload);
              return false;
            }
          }
        }
        await saveState(state);
        return false;
      }

      // distFromLast >= 10m: confirm it's a real step (not a 1s GPS spike)
      const isMovingSpeed = payload.speed != null && payload.speed >= 0.6;
      if (!isMovingSpeed) {
        if (!state.pendingDeparture || payloadMs - state.pendingDeparture.timestampMs > 90000) {
          state.pendingDeparture = {
            latitude: smoothedLat,
            longitude: smoothedLng,
            timestampMs: payloadMs,
            distFromAnchor: distFromLast,
          };
          await saveState(state);
          return false;
        }
      }
      state.pendingDeparture = null;
      state.stationaryAnchor = isStationarySpeed ? { latitude: smoothedLat, longitude: smoothedLng } : null;
    } else {
      // OFFLINE MODE:
      // - Strict 25m stationary anchor + 15m radius filter so indoor drift doesn't fill offline cache
      // - 5-minute stationary refinement still updates 2-15m shifts
      if (!state.stationaryAnchor && isStationarySpeed) {
        state.stationaryAnchor = {
          latitude: state.lastRecordedCoord.latitude,
          longitude: state.lastRecordedCoord.longitude,
        };
      }

      if (state.stationaryAnchor) {
        const distFromAnchor = getDistanceMeters(
          smoothedLat,
          smoothedLng,
          state.stationaryAnchor.latitude,
          state.stationaryAnchor.longitude
        );

        // Within 25m of anchor: indoor GPS drift or minor <15m shift (e.g. 5m)
        if (distFromAnchor < 25) {
          state.pendingDeparture = null;
          const lastStatMs = state.lastStationaryUpdateMs ?? state.lastRecordedTimestamp ?? payloadMs;
          if (payloadMs - lastStatMs >= STATIONARY_REFINE_INTERVAL_MS) {
            state.lastStationaryUpdateMs = payloadMs;
            if (distFromLast >= 2 && distFromLast < 15) {
              state.lastRecordedCoord = { latitude: smoothedLat, longitude: smoothedLng };
              state.lastRecordedTimestamp = payloadMs;
              state.stationaryAnchor = { latitude: smoothedLat, longitude: smoothedLng };
              await saveState(state);
              try {
                await sendPingWithTimeout(smoothedPayload);
                flushOfflineQueue().catch(() => {});
                return true;
              } catch (networkErr) {
                await enqueueOfflineCoordinate(smoothedPayload);
                return false;
              }
            }
          }
          await saveState(state);
          return false;
        }

        // First reading >= 25m: hold as pendingDeparture instead of immediately breaking the anchor
        if (
          !state.pendingDeparture ||
          payloadMs - state.pendingDeparture.timestampMs > 90000
        ) {
          state.pendingDeparture = {
            latitude: smoothedLat,
            longitude: smoothedLng,
            timestampMs: payloadMs,
            distFromAnchor,
          };
          await saveState(state);
          return false;
        }

        // If GPS is converging BACK toward the stationary anchor while speed is stationary, stay anchored
        if (
          distFromAnchor < state.pendingDeparture.distFromAnchor - 12 &&
          isStationarySpeed
        ) {
          state.pendingDeparture = {
            latitude: smoothedLat,
            longitude: smoothedLng,
            timestampMs: payloadMs,
            distFromAnchor,
          };
          await saveState(state);
          return false;
        }

        const dtPendingSec = Math.max(
          1,
          (payloadMs - state.pendingDeparture.timestampMs) / 1000
        );
        const distFromPending = getDistanceMeters(
          smoothedLat,
          smoothedLng,
          state.pendingDeparture.latitude,
          state.pendingDeparture.longitude
        );

        // If the jump between pending and current is itself an impossible teleport (> 55 m/s), reset pending
        if (distFromPending / dtPendingSec > 55) {
          state.pendingDeparture = {
            latitude: smoothedLat,
            longitude: smoothedLng,
            timestampMs: payloadMs,
            distFromAnchor,
          };
          await saveState(state);
          return false;
        }

        const hasConfirmedDeparture =
          (payload.speed != null && payload.speed >= 0.7) ||
          (distFromAnchor >= 35 && distFromPending >= 5);

        if (!hasConfirmedDeparture) {
          state.pendingDeparture = {
            latitude: smoothedLat,
            longitude: smoothedLng,
            timestampMs: payloadMs,
            distFromAnchor,
          };
          await saveState(state);
          return false;
        }

        // Confirmed genuine departure from stationary anchor
        state.stationaryAnchor = null;
        state.pendingDeparture = null;
      }

      // If moved < 15 meters while in motion offline: skip (do NOT cache) unless 5-minute stationary refinement triggers
      if (distFromLast < 15) {
        const lastStatMs = state.lastStationaryUpdateMs ?? state.lastRecordedTimestamp ?? payloadMs;
        if (isStationarySpeed && payloadMs - lastStatMs >= STATIONARY_REFINE_INTERVAL_MS) {
          state.lastStationaryUpdateMs = payloadMs;
          if (distFromLast >= 2) {
            state.lastRecordedCoord = { latitude: smoothedLat, longitude: smoothedLng };
            state.lastRecordedTimestamp = payloadMs;
            state.stationaryAnchor = { latitude: smoothedLat, longitude: smoothedLng };
            await saveState(state);
            try {
              await sendPingWithTimeout(smoothedPayload);
              flushOfflineQueue().catch(() => {});
              return true;
            } catch (networkErr) {
              await enqueueOfflineCoordinate(smoothedPayload);
              return false;
            }
          }
        }
        await saveState(state);
        return false;
      }
    }

    // Offline 10-second trail cadence: when online, record every 10m apart immediately regardless of elapsed seconds
    if (
      !isDeviceOnline &&
      state.lastRecordedTimestamp != null &&
      payloadMs - state.lastRecordedTimestamp < TRAIL_INTERVAL_MS
    ) {
      await saveState(state);
      return false;
    }

    // Confirmed movement (>= 10m online, or >= 15m & >= 10s offline):
    state.lastRecordedCoord = {
      latitude: smoothedLat,
      longitude: smoothedLng,
    };
    state.lastRecordedTimestamp = payloadMs;
    state.lastRecordedAccuracy = payload.accuracy ?? null;
    state.lastStationaryUpdateMs = payloadMs;
    if (isStationarySpeed) {
      state.stationaryAnchor = {
        latitude: smoothedLat,
        longitude: smoothedLng,
      };
    }
    await saveState(state);

    // Transmit to server (or cache offline for 10s trail playback when back online)
    try {
      await sendPingWithTimeout(smoothedPayload);
      flushOfflineQueue().catch(() => {});
      return true;
    } catch (networkErr) {
      await enqueueOfflineCoordinate(smoothedPayload);
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
