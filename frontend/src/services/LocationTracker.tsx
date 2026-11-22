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
      clearTrackingState();
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

    async function initTracking() {
      try {
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
                    timestamp: new Date(pos.timestamp).toISOString(),
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
          const { status: fgStatus } =
            await Location.requestForegroundPermissionsAsync();
          if (fgStatus !== "granted") {
            return;
          }

          // Request background permission for continuous tracking (keeps transmitting on phone restart/background)
          try {
            const { status: bgStatus } =
              await Location.requestBackgroundPermissionsAsync();
            if (bgStatus === "granted") {
              const hasStarted =
                await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
              if (!hasStarted) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                  accuracy: Location.Accuracy.BestForNavigation,
                  timeInterval: 10000,
                  // distanceInterval removed: TrackingEngine already filters by 10m,
                  // double-filtering was causing missed updates when moving <10m
                  foregroundService: {
                    notificationTitle: "Live Location Tracking",
                    notificationBody: "Transmitting route coordinates every 10s",
                    notificationColor: "#3B82F6",
                  },
                  pausesUpdatesAutomatically: false,
                });
              }
            }
          } catch (bgErr) {
            console.warn("[LocationTracker] Background service setup:", bgErr);
          }

          // Foreground watchdog timer (every 10s)
          const sendForegroundLocation = async () => {
            if (!isMounted || !isAuthRef.current) return;
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
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
