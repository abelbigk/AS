import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useAuth } from "../contexts/AuthContext";
import {
  processAndSendCoordinate,
  clearTrackingState,
} from "./TrackingEngine";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

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
            await processAndSendCoordinate({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
              altitude: loc.coords.altitude,
              timestamp: new Date(loc.timestamp).toISOString(),
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
  const { isAuthenticated } = useAuth();
  const isAuthRef = useRef(isAuthenticated);
  isAuthRef.current = isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      // User is logged out: stop background updates and clean state
      if (Platform.OS !== "web") {
        Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
          .then((started) => {
            if (started) {
              return Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            }
          })
          .catch(() => {});
      }
      clearTrackingState();
      return;
    }

    let isMounted = true;
    let foregroundTimer: any = null;

    async function initTracking() {
      try {
        if (Platform.OS === "web") {
          // --- WEB GEOLOCATION TRACKING ---
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
                    timestamp: new Date(pos.timestamp).toISOString(),
                  });
                },
                (err) => console.log("[LocationTracker Web] Error:", err.message),
                { enableHighAccuracy: true, timeout: 8000 }
              );
            };

            // Trigger immediately and then poll every 10 seconds
            sendWebLocation();
            foregroundTimer = setInterval(sendWebLocation, 10000);
          }
        } else {
          // --- NATIVE ANDROID / IOS BACKGROUND TRACKING ---
          // 1. Request Foreground Permissions
          const { status: fgStatus } =
            await Location.requestForegroundPermissionsAsync();
          if (fgStatus !== "granted") {
            console.log("[LocationTracker] Foreground location permission not granted");
            return;
          }

          // 2. Request Background Permissions ("Always Allow")
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch (bgErr) {
            console.log("[LocationTracker] Background permission request:", bgErr);
          }

          // 3. Start Background Location Service (Survives app close / background)
          try {
            const hasStarted =
              await Location.hasStartedLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK
              );

            if (!hasStarted) {
              await Location.startLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK,
                {
                  accuracy: Location.Accuracy.High,
                  timeInterval: 10000, // 10 seconds
                  distanceInterval: 0, // capture all 10s intervals for stationary detection
                  deferredUpdatesInterval: 10000,
                  foregroundService: {
                    notificationTitle: "Delivery Route Active",
                    notificationBody: "Broadcasting live coordinates...",
                    notificationColor: "#3B82F6",
                  },
                  pausesUpdatesAutomatically: false,
                  showsBackgroundLocationIndicator: true,
                  activityType: Location.ActivityType.AutomotiveNavigation,
                }
              );
              console.log("[LocationTracker] Background location task started");
            }
          } catch (taskErr) {
            console.warn(
              "[LocationTracker] Could not start background task (Expo Go fallback):",
              taskErr
            );
          }

          // 4. Foreground watchdog: polls every 10 seconds while app is in foreground
          const sendForegroundLocation = async () => {
            if (!isMounted || !isAuthRef.current) return;
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              if (!isMounted || !isAuthRef.current) return;
              await processAndSendCoordinate({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                speed: loc.coords.speed,
                heading: loc.coords.heading,
                altitude: loc.coords.altitude,
                timestamp: new Date(loc.timestamp).toISOString(),
              });
            } catch (locErr: any) {
              // Ignore temporary GPS timeout
            }
          };

          sendForegroundLocation();
          foregroundTimer = setInterval(sendForegroundLocation, 10000);
        }
      } catch (err) {
        console.error("[LocationTracker] Init error:", err);
      }
    }

    initTracking();

    return () => {
      isMounted = false;
      if (foregroundTimer) clearInterval(foregroundTimer);
    };
  }, [isAuthenticated]);

  return null;
}
