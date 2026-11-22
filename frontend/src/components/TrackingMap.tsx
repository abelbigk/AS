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
  isFullScreen?: boolean;
  style?: any;
}

export function TrackingMap({
  locations,
  username,
  selectedPointId,
  isFullScreen = false,
  style,
}: TrackingMapProps) {
  const { theme, colors } = useTheme();

  const htmlContent = useMemo(() => {
    const isDark = theme === "dark";
    const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const tileAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
          ${isDark ? '.leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(90%); }' : ''}
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
          .waypoint-arrow-box {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.45));
            transition: transform 0.2s ease;
          }
          .live-avatar-wrap {
            position: relative;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .avatar-radar {
            position: absolute;
            inset: 2px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.25);
            border: 2px solid #3B82F6;
            animation: radarPulse 2s infinite ease-out;
          }
          @keyframes radarPulse {
            0% { transform: scale(0.85); opacity: 0.9; }
            70% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .avatar-heading-beam {
            position: absolute;
            width: 32px;
            height: 32px;
            top: 4px;
            left: 4px;
            pointer-events: none;
            filter: drop-shadow(0 2px 4px rgba(59,130,246,0.6));
          }
          .avatar-core {
            position: relative;
            width: 26px;
            height: 26px;
            border-radius: 13px;
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .avatar-core span {
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1;
          }
          .start-pin {
            width: 14px;
            height: 14px;
            background: #10B981;
            border-radius: 50%;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const points = ${safeLocations};
          const targetId = ${selectedPointId != null ? selectedPointId : "null"};
          const markerMap = {};
          const map = L.map('map', { zoomControl: false });
          L.control.zoom({ position: 'topright' }).addTo(map);

          L.tileLayer('${tileUrl}', {
            attribution: '${tileAttr}',
            maxZoom: 19
          }).addTo(map);

          function computeBearing(p1, p2) {
            var dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
            var y = Math.sin(dLon) * Math.cos((p2.latitude * Math.PI) / 180);
            var x = Math.cos((p1.latitude * Math.PI) / 180) * Math.sin((p2.latitude * Math.PI) / 180) -
                    Math.sin((p1.latitude * Math.PI) / 180) * Math.cos((p2.latitude * Math.PI) / 180) * Math.cos(dLon);
            return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
          }

          function getCompassName(deg) {
            var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            return dirs[Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8];
          }

          if (points && points.length > 0) {
            if (points.length === 1) {
              const pt = points[0];
              const userInitial = ('${username || "U"}').charAt(0).toUpperCase();
              const singleIcon = L.divIcon({
                className: 'live-avatar-marker',
                html: '<div class="live-avatar-wrap">' +
                      '  <div class="avatar-radar"></div>' +
                      '  <div class="avatar-core"><span>' + userInitial + '</span></div>' +
                      '</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });
              const timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const marker = L.marker([pt.latitude, pt.longitude], { icon: singleIcon })
                .addTo(map)
                .bindPopup('<b>Current Position: ${username || "User"}</b><br>' + timeStr, { className: 'custom-popup' })
                .openPopup();
              markerMap[pt.id] = marker;
              map.setView([pt.latitude, pt.longitude], 16);
            } else {
              const latlngs = points.map(p => [p.latitude, p.longitude]);

              // 1. Dual-layer road path (casing + core line)
              const casingLine = L.polyline(latlngs, {
                color: '#1E3A8A',
                weight: 7,
                opacity: 0.5,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);

              const polyline = L.polyline(latlngs, {
                color: '#3B82F6',
                weight: 4,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round',
                dashArray: null
              }).addTo(map);

              // 2. Fetch short valid road/street path from OSRM routing engine
              try {
                // If more than 70 points, sample for OSRM URL limit
                var queryPts = points;
                if (points.length > 70) {
                  var qStep = Math.ceil(points.length / 50);
                  queryPts = points.filter(function(_, idx) { return idx % qStep === 0 || idx === points.length - 1; });
                }
                var osrmCoords = queryPts.map(function(p) { return p.longitude + ',' + p.latitude; }).join(';');
                var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + osrmCoords + '?overview=full&geometries=geojson';
                fetch(osrmUrl)
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                    if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
                      var roadPath = data.routes[0].geometry.coordinates.map(function(c) {
                        return [c[1], c[0]];
                      });
                      casingLine.setLatLngs(roadPath);
                      polyline.setLatLngs(roadPath);
                      if (!targetId) {
                        map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
                      }
                    }
                  })
                  .catch(function() {});
              } catch (e) {}

              // 3. Add starting marker
              const startPoint = points[0];
              const startIcon = L.divIcon({
                className: 'start-pin-wrapper',
                html: '<div class="start-pin"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              const startTimeStr = new Date(startPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon })
                .addTo(map)
                .bindPopup('<b>Trip Start</b><br>' + startTimeStr, { className: 'custom-popup' });
              markerMap[startPoint.id] = startMarker;

              // 4. Add intermediate waypoints with DIRECTION ARROWS
              for (let i = 1; i < points.length - 1; i++) {
                const pt = points[i];
                const timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const speedStr = pt.speed != null ? Math.round(pt.speed * 3.6) + ' km/h' : 'N/A';
                const heading = (pt.heading != null && pt.heading > 0)
                  ? Math.round(pt.heading)
                  : computeBearing(pt, points[i + 1]);

                const waypointIcon = L.divIcon({
                  className: 'waypoint-marker',
                  html: '<div class="waypoint-arrow-box" style="transform: rotate(' + heading + 'deg);">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16">' +
                        '<polygon points="12,2 21,20 12,15 3,20" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>' +
                        '</svg></div>',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });

                const wpMarker = L.marker([pt.latitude, pt.longitude], { icon: waypointIcon }).addTo(map);

                wpMarker.bindPopup(
                  '<b>Waypoint #' + (i + 1) + '</b><br>' +
                  '<b>Time:</b> ' + timeStr + '<br>' +
                  '<b>Direction:</b> ' + heading + '&deg; (' + getCompassName(heading) + ')<br>' +
                  '<b>Speed:</b> ' + speedStr + '<br>' +
                  '<b>Coords:</b> ' + pt.latitude.toFixed(5) + ', ' + pt.longitude.toFixed(5),
                  { className: 'custom-popup' }
                );
                markerMap[pt.id] = wpMarker;
              }

              // 5. Add latest CURRENT LIVE AVATAR with DIRECTION BEAM
              const lastPoint = points[points.length - 1];
              const lastHeading = (lastPoint.heading != null && lastPoint.heading > 0)
                ? Math.round(lastPoint.heading)
                : (points.length >= 2 ? computeBearing(points[points.length - 2], lastPoint) : 0);
              const userInitial = ('${username || "U"}').charAt(0).toUpperCase();

              const avatarIcon = L.divIcon({
                className: 'live-avatar-marker',
                html: '<div class="live-avatar-wrap">' +
                      '  <div class="avatar-radar"></div>' +
                      '  <div class="avatar-heading-beam" style="transform: rotate(' + lastHeading + 'deg);">' +
                      '    <svg viewBox="0 0 32 32" width="32" height="32">' +
                      '      <polygon points="16,1 25,18 16,13 7,18" fill="#3B82F6" opacity="0.95"/>' +
                      '    </svg>' +
                      '  </div>' +
                      '  <div class="avatar-core">' +
                      '    <span>' + userInitial + '</span>' +
                      '  </div>' +
                      '</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });

              const lastTimeStr = new Date(lastPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const lastSpeedStr = lastPoint.speed != null ? Math.round(lastPoint.speed * 3.6) + ' km/h' : 'N/A';
              const lastMarker = L.marker([lastPoint.latitude, lastPoint.longitude], { icon: avatarIcon }).addTo(map);
              lastMarker.bindPopup(
                '<b>Live Avatar: ${username || "User"}</b><br>' +
                '<b>Direction:</b> ' + lastHeading + '&deg; (' + getCompassName(lastHeading) + ')<br>' +
                '<b>Time:</b> ' + lastTimeStr + '<br>' +
                '<b>Speed:</b> ' + lastSpeedStr + '<br>' +
                '<b>Coordinates:</b> ' + lastPoint.latitude.toFixed(5) + ', ' + lastPoint.longitude.toFixed(5),
                { className: 'custom-popup' }
              );
              markerMap[lastPoint.id] = lastMarker;

              if (targetId && markerMap[targetId]) {
                const m = markerMap[targetId];
                map.setView(m.getLatLng(), 17);
                m.openPopup();
              } else {
                lastMarker.openPopup();
                map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
              }
            }

            window.addEventListener('message', function(e) {
              try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data && data.focusPointId && markerMap[data.focusPointId]) {
                  const m = markerMap[data.focusPointId];
                  map.flyTo(m.getLatLng(), 17, { duration: 0.8 });
                  m.openPopup();
                }
              } catch(err) {}
            });
          } else {
            // Default center if no coordinates
            map.setView([9.02, 38.74], 12);
          }
        </script>
      </body>
      </html>
    `;
  }, [locations, theme, username, selectedPointId]);

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
      <View
        style={[
          styles.mapContainer,
          isFullScreen && styles.mapContainerFullscreen,
          style,
        ]}
      >
        <iframe
          srcDoc={htmlContent}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: isFullScreen ? 0 : 16,
          }}
          title="Leaflet Tracking Map"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.mapContainer,
        isFullScreen && styles.mapContainerFullscreen,
        style,
      ]}
    >
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
  mapContainerFullscreen: {
    height: "100%",
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
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
