import React, { useEffect, useRef } from "react";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useAuth } from "../contexts/AuthContext";
import { getBaseApiUrl } from "../lib/config";
import {
  processAndSendCoordinate,
  updateLiveCompassHeading,
  pingLivePresenceFromBackground,
  clearTrackingState,
  flushOfflineQueue,
} from "./TrackingEngine";

const { TrackingServiceModule } = NativeModules;

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

/**
 * Returns a local ISO timestamp in Africa/Nairobi (UTC+3) format:
 * e.g. "2026-11-23T03:30:00.000+03:00"
 * This guarantees the date string ALWAYS matches the true local calendar date.
 */
export function getLocalNairobiTimestamp(epochMs: number = Date.now()): string {
  const d = new Date(epochMs + 3 * 3600 * 1000);
  return d.toISOString().replace("Z", "+03:00");
}

// Register the background location task at module scope (outside React lifecycle)
if (Platform.OS !== "web") {
  try {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error("[BackgroundLocationTask] Task error:", error.message);
        return;
      }
      if (data) {
        const { locations } = data as { locations?: Location.LocationObject[] };
        if (locations && locations.length > 0) {
          for (const loc of locations) {
            // Skip stale OS cached fixes (>15s) for DB recording, but keep online live heartbeat alive
            if (loc.timestamp && Date.now() - loc.timestamp > 15000) {
              pingLivePresenceFromBackground(loc.coords.latitude, loc.coords.longitude);
              continue;
            }
            await processAndSendCoordinate({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
              altitude: loc.coords.altitude,
              timestamp: getLocalNairobiTimestamp(loc.timestamp),
            });
          }
        }
      }
    });
  } catch (err) {
    console.warn("[BackgroundLocationTask] Error defining task:", err);
  }
}

export function LocationTracker() {
  const { isAuthenticated, user, token } = useAuth();
  const shouldTrack = isAuthenticated && user?.role !== "admin";
  const isAuthRef = useRef(shouldTrack);
  isAuthRef.current = shouldTrack;

  useEffect(() => {
    if (!shouldTrack) {
      clearTrackingState();
      if (Platform.OS === "android") {
        try {
          TrackingServiceModule?.stopService();
        } catch {}
      }
      if (Platform.OS !== "web") {
        Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
          .then((started) => {
            if (started) {
              return Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            }
          })
          .catch(() => {});
      }
      return;
    }

    let isMounted = true;
    let foregroundTimer: any = null;
    let jsAliveTimer: any = null;
    let watchSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let latestCompassHeading: number | null = null;

    async function initTracking() {
      try {
        flushOfflineQueue().catch(() => {});
        if (Platform.OS === "web") {
          // --- WEB GEOLOCATION TRACKING (10s interval) ---
          if ("geolocation" in navigator) {
            const sendWebLocation = () => {
              if (!isMounted || !isAuthRef.current) return;
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  if (!isMounted || !isAuthRef.current) return;
                  await processAndSendCoordinate({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    speed: pos.coords.speed,
                    heading: pos.coords.heading,
                    altitude: pos.coords.altitude,
                    timestamp: getLocalNairobiTimestamp(pos.timestamp),
                  });
                },
                (err) => console.log("[LocationTracker Web] Error:", err.message),
                { enableHighAccuracy: true, timeout: 8000 }
              );
            };

            sendWebLocation();
            foregroundTimer = setInterval(sendWebLocation, 10000);
          }
        } else {
          // --- NATIVE ANDROID / IOS TRACKING ---
          if (Platform.OS === "android") {
            try {
              await Location.enableNetworkProviderAsync();
            } catch {}
            // Request notification permission on Android 13+ so foreground service stays visible
            if (typeof Platform.Version === "number" && Platform.Version >= 33) {
              try {
                await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
              } catch {}
            }
          }

          const { status: fgStatus } =
            await Location.requestForegroundPermissionsAsync();
          if (fgStatus !== "granted") {
            return;
          }

          // Request background permission for continuous tracking (keeps transmitting on phone restart/background)
          try {
            const { status: bgStatus } =
              await Location.requestBackgroundPermissionsAsync();
            if (Platform.OS === "android") {
              // Stop legacy expo-location background service so only our native PersistentTrackingService runs
              try {
                const legacyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                if (legacyStarted) {
                  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                }
              } catch {}

              if (token) {
                TrackingServiceModule?.startService(token, getBaseApiUrl(), user?.role ?? "user");
                jsAliveTimer = setInterval(() => {
                  if (isMounted && isAuthRef.current) {
                    TrackingServiceModule?.pingJsAlive();
                  }
                }, 5000);
              }
              try {
                const ignoring = await TrackingServiceModule?.isIgnoringBatteryOptimizations();
                if (!ignoring) {
                  TrackingServiceModule?.requestIgnoreBatteryOptimizations();
                }
              } catch {}
            } else if (bgStatus === "granted") {
              await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 0,
                deferredUpdatesInterval: 0,
                deferredUpdatesDistance: 0,
                pausesUpdatesAutomatically: false,
              });
            }
          } catch (bgErr) {
            console.warn("[LocationTracker] Background service setup:", bgErr);
          }

          // Live magnetometer/compass heading so the avatar turns when rotating in place
          try {
            headingSubscription = await Location.watchHeadingAsync((h) => {
              if (!isMounted || !isAuthRef.current) return;
              const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
              if (deg >= 0) {
                latestCompassHeading = deg;
                updateLiveCompassHeading(deg);
              }
            });
          } catch {}

          // Continuous foreground stream (keeps Google Fused Location Kalman filter warm like Google Maps)
          watchSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 0,
            },
            async (loc) => {
              if (!isMounted || !isAuthRef.current) return;
              if (loc.timestamp && Date.now() - loc.timestamp > 15000) return;
              const gpsSpeed = loc.coords.speed ?? 0;
              const gpsHeading = loc.coords.heading;
              const effectiveHeading =
                gpsSpeed >= 1.2 && gpsHeading != null && gpsHeading >= 0
                  ? gpsHeading
                  : (latestCompassHeading ?? gpsHeading);
              await processAndSendCoordinate({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                speed: loc.coords.speed,
                heading: effectiveHeading,
                altitude: loc.coords.altitude,
                timestamp: getLocalNairobiTimestamp(loc.timestamp),
              });
            }
          );
        }
      } catch (err) {
        console.error("[LocationTracker] Init error:", err);
      }
    }

    initTracking();

    return () => {
      isMounted = false;
      if (foregroundTimer) clearInterval(foregroundTimer);
      if (jsAliveTimer) clearInterval(jsAliveTimer);
      if (watchSubscription) {
        try {
          watchSubscription.remove();
        } catch {}
      }
      if (headingSubscription) {
        try {
          headingSubscription.remove();
        } catch {}
      }
    };
  }, [shouldTrack, token]);

  return null;
}
