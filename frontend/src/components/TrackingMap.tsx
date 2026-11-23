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
            padding: 2px;
          }
          .custom-popup .leaflet-popup-content {
            margin: 10px 12px;
            line-height: 1.4;
          }
          .custom-popup .leaflet-popup-tip {
            background: ${isDark ? "rgba(24, 24, 27, 0.95)" : "rgba(255, 255, 255, 0.95)"};
          }
          .popup-card {
            font-size: 11px;
            min-width: 175px;
          }
          .popup-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 4px;
          }
          .popup-title {
            font-weight: 700;
            font-size: 12px;
            color: ${isDark ? "#60A5FA" : "#2563EB"};
          }
          .popup-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 8px;
            background: ${isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.15)"};
            color: ${isDark ? "#93C5FD" : "#1D4ED8"};
          }
          .popup-info-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 2px;
            color: ${isDark ? "#D1D5DB" : "#4B5563"};
          }
          .popup-coords-text {
            font-family: monospace;
            font-size: 10.5px;
            margin-top: 4px;
            color: ${isDark ? "#9CA3AF" : "#6B7280"};
          }
          .popup-bot-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"};
          }
          .popup-nav-pin-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 7px;
            border-radius: 6px;
            background: ${isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.1)"};
            color: ${isDark ? "#60A5FA" : "#2563EB"};
            border: 1px solid ${isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.3)"};
            font-size: 11px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .popup-nav-pin-btn:hover {
            background: #3B82F6;
            color: #FFFFFF;
          }
          .popup-step-btns {
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }
          .popup-step-btn {
            padding: 3px 7px;
            border-radius: 5px;
            background: ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"};
            color: ${isDark ? "#E5E7EB" : "#374151"};
            border: 1px solid ${isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)"};
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .popup-step-btn:hover:not(:disabled) {
            background: ${isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)"};
          }
          .popup-step-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
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

          function buildPopupContent(idx, title, badge, extraRows) {
            var pt = points[idx];
            var timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            var navUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + pt.latitude + ',' + pt.longitude;
            var prevDisabled = idx <= 0 ? 'disabled' : '';
            var nextDisabled = idx >= points.length - 1 ? 'disabled' : '';

            return '<div class="popup-card">' +
              '<div class="popup-head">' +
                '<span class="popup-title">' + title + '</span>' +
                (badge ? '<span class="popup-badge">' + badge + '</span>' : '') +
              '</div>' +
              '<div class="popup-info-row"><span>Time:</span> <b>' + timeStr + '</b></div>' +
              (extraRows || '') +
              '<div class="popup-coords-text">' + pt.latitude.toFixed(5) + ', ' + pt.longitude.toFixed(5) + '</div>' +
              '<div class="popup-bot-row">' +
                '<a href="' + navUrl + '" target="_blank" rel="noopener noreferrer" class="popup-nav-pin-btn" title="Open navigation in Maps">' +
                  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                  '<span>Navigate</span>' +
                '</a>' +
                '<div class="popup-step-btns">' +
                  '<button type="button" onclick="window.goToPoint(' + (idx - 1) + ')" class="popup-step-btn" ' + prevDisabled + ' title="Previous waypoint">&lsaquo; Prev</button>' +
                  '<button type="button" onclick="window.goToPoint(' + (idx + 1) + ')" class="popup-step-btn" ' + nextDisabled + ' title="Next waypoint">Next &rsaquo;</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }

          window.goToPoint = function(idx) {
            if (idx < 0 || idx >= points.length) return;
            var targetPt = points[idx];
            if (markerMap[targetPt.id]) {
              var m = markerMap[targetPt.id];
              map.flyTo(m.getLatLng(), 17, { duration: 0.6 });
              m.openPopup();
            }
          };

          function getDistanceM(p1, p2) {
            var R = 6371e3;
            var dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
            var dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((p1.latitude * Math.PI) / 180) * Math.cos((p2.latitude * Math.PI) / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          if (points && points.length > 0) {
            // Filter to waypoints that represent true physical movement >= 10m apart
            var movingPoints = [points[0]];
            for (var i = 1; i < points.length; i++) {
              var d = getDistanceM(movingPoints[movingPoints.length - 1], points[i]);
              if (d >= 10) {
                movingPoints.push(points[i]);
              }
            }

            // If user did not move >= 10 meters (stationary at the house):
            // Show only the live position marker — DO NOT draw any lines across blocks
            if (movingPoints.length < 2) {
              const pt = points[points.length - 1];
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
              const marker = L.marker([pt.latitude, pt.longitude], { icon: singleIcon })
                .addTo(map)
                .bindPopup(buildPopupContent(points.length - 1, 'Current Position: ${username || "User"}', 'Live (Stationary)', ''), { className: 'custom-popup' })
                .openPopup();
              markerMap[pt.id] = marker;
              map.setView([pt.latitude, pt.longitude], 17);
            } else {
              // True physical movement >= 10m! Draw road-snapped route along streets & blocks
              const casingLine = L.polyline([], {
                color: '#1E3A8A',
                weight: 7,
                opacity: 0.5,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);

              const polyline = L.polyline([], {
                color: '#3B82F6',
                weight: 4,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);

              // Fetch valid street path from OSRM routing engine along roads and blocks
              try {
                var queryPts = movingPoints;
                if (movingPoints.length > 50) {
                  var qStep = Math.ceil(movingPoints.length / 40);
                  queryPts = movingPoints.filter(function(_, idx) { return idx % qStep === 0 || idx === movingPoints.length - 1; });
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
                        map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 17 });
                      }
                    } else {
                      var fallbackLine = movingPoints.map(function(p) { return [p.latitude, p.longitude]; });
                      casingLine.setLatLngs(fallbackLine);
                      polyline.setLatLngs(fallbackLine);
                      if (!targetId) {
                        map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 17 });
                      }
                    }
                  })
                  .catch(function() {
                    var fallbackLine = movingPoints.map(function(p) { return [p.latitude, p.longitude]; });
                    casingLine.setLatLngs(fallbackLine);
                    polyline.setLatLngs(fallbackLine);
                    if (!targetId) {
                      map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 17 });
                    }
                  });
              } catch (e) {
                var fallbackLine = movingPoints.map(function(p) { return [p.latitude, p.longitude]; });
                casingLine.setLatLngs(fallbackLine);
                polyline.setLatLngs(fallbackLine);
              }

              // 3. Add starting marker
              const startPoint = points[0];
              const startIcon = L.divIcon({
                className: 'start-pin-wrapper',
                html: '<div class="start-pin"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon })
                .addTo(map)
                .bindPopup(buildPopupContent(0, 'Trip Start', 'Start', ''), { className: 'custom-popup' });
              markerMap[startPoint.id] = startMarker;

              // 4. Add intermediate waypoints with DIRECTION ARROWS
              for (let i = 1; i < points.length - 1; i++) {
                const pt = points[i];
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

                var extraRows = '<div class="popup-info-row"><span>Direction:</span> <b>' + heading + '&deg; (' + getCompassName(heading) + ')</b></div>' +
                                '<div class="popup-info-row"><span>Speed:</span> <b>' + speedStr + '</b></div>';

                wpMarker.bindPopup(
                  buildPopupContent(i, 'Waypoint #' + (i + 1), (i + 1) + '/' + points.length, extraRows),
                  { className: 'custom-popup' }
                );
                markerMap[pt.id] = wpMarker;
              }

              // 5. Add latest CURRENT LIVE AVATAR with DIRECTION BEAM
              const lastIdx = points.length - 1;
              const lastPoint = points[lastIdx];
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

              const lastSpeedStr = lastPoint.speed != null ? Math.round(lastPoint.speed * 3.6) + ' km/h' : 'N/A';
              const lastMarker = L.marker([lastPoint.latitude, lastPoint.longitude], { icon: avatarIcon }).addTo(map);
              var lastExtraRows = '<div class="popup-info-row"><span>Direction:</span> <b>' + lastHeading + '&deg; (' + getCompassName(lastHeading) + ')</b></div>' +
                                  '<div class="popup-info-row"><span>Speed:</span> <b>' + lastSpeedStr + '</b></div>';

              lastMarker.bindPopup(
                buildPopupContent(lastIdx, 'Live Avatar: ${username || "User"}', 'Live', lastExtraRows),
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
