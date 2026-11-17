import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { MapPin } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export interface LocationPoint {
  id: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
}

interface TrackingMapProps {
  locations: LocationPoint[];
  username?: string;
  selectedPointId?: number | null;
}

export function TrackingMap({ locations, username, selectedPointId }: TrackingMapProps) {
  const { theme, colors } = useTheme();

  const htmlContent = useMemo(() => {
    const isDark = theme === "dark";
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const tileAttr = isDark
      ? '&copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    const safeLocations = JSON.stringify(locations);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html, #map { width: 100%; height: 100%; background: ${isDark ? "#121212" : "#f5f5f5"}; }
          .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .custom-popup .leaflet-popup-content-wrapper {
            background: ${isDark ? "rgba(24, 24, 27, 0.95)" : "rgba(255, 255, 255, 0.95)"};
            color: ${isDark ? "#ffffff" : "#000000"};
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            border: 1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"};
          }
          .custom-popup .leaflet-popup-tip {
            background: ${isDark ? "rgba(24, 24, 27, 0.95)" : "rgba(255, 255, 255, 0.95)"};
          }
          .pulsing-pin {
            width: 14px;
            height: 14px;
            background: #3B82F6;
            border-radius: 50%;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 0 rgba(59, 130, 246, 0.6);
            animation: pulse 1.8s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }
          .start-pin {
            width: 12px;
            height: 12px;
            background: #10B981;
            border-radius: 50%;
            border: 2px solid #FFFFFF;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const points = ${safeLocations};
          const map = L.map('map', { zoomControl: false });
          L.control.zoom({ position: 'topright' }).addTo(map);

          L.tileLayer('${tileUrl}', {
            attribution: '${tileAttr}',
            maxZoom: 19
          }).addTo(map);

          if (points && points.length > 0) {
            const latlngs = points.map(p => [p.latitude, p.longitude]);

            // Draw connecting route line
            const polyline = L.polyline(latlngs, {
              color: '#3B82F6',
              weight: 4,
              opacity: 0.85,
              lineJoin: 'round',
              dashArray: null
            }).addTo(map);

            // Add starting marker
            const startPoint = points[0];
            const startIcon = L.divIcon({
              className: 'start-pin-wrapper',
              html: '<div class="start-pin"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            const startTimeStr = new Date(startPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon })
              .addTo(map)
              .bindPopup('<b>Trip Start</b><br>' + startTimeStr, { className: 'custom-popup' });

            // Add intermediate dots
            for (let i = 1; i < points.length - 1; i++) {
              const pt = points[i];
              const timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const speedStr = pt.speed != null ? Math.round(pt.speed * 3.6) + ' km/h' : 'N/A';

              const circle = L.circleMarker([pt.latitude, pt.longitude], {
                radius: 4,
                color: '#3B82F6',
                fillColor: '#60A5FA',
                fillOpacity: 0.7,
                weight: 1
              }).addTo(map);

              circle.bindPopup(
                '<b>Timestamp:</b> ' + timeStr + '<br>' +
                '<b>Speed:</b> ' + speedStr + '<br>' +
                '<b>Coords:</b> ' + pt.latitude.toFixed(5) + ', ' + pt.longitude.toFixed(5),
                { className: 'custom-popup' }
              );
            }

            // Add latest/current marker
            const lastPoint = points[points.length - 1];
            const endIcon = L.divIcon({
              className: 'end-pin-wrapper',
              html: '<div class="pulsing-pin"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            });
            const lastTimeStr = new Date(lastPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const lastSpeedStr = lastPoint.speed != null ? Math.round(lastPoint.speed * 3.6) + ' km/h' : 'N/A';
            L.marker([lastPoint.latitude, lastPoint.longitude], { icon: endIcon })
              .addTo(map)
              .bindPopup(
                '<b>Latest Position: ${username || "User"}</b><br>' +
                '<b>Time:</b> ' + lastTimeStr + '<br>' +
                '<b>Speed:</b> ' + lastSpeedStr,
                { className: 'custom-popup' }
              ).openPopup();

            map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
          } else {
            // Default center if no coordinates
            map.setView([9.02, 38.74], 12);
          }
        </script>
      </body>
      </html>
    `;
  }, [locations, theme, username]);

  if (locations.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.glassBg, borderColor: colors.border }]}>
        <MapPin size={32} color={colors.textSubtle} style={{ marginBottom: 8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Route Recorded</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          No coordinates were transmitted for this date.
        </Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.mapContainer}>
        <iframe
          srcDoc={htmlContent}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 }}
          title="Leaflet Tracking Map"
        />
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: "100%",
    height: 340,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 16,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  emptyContainer: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
