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
          
          /* Dark mode invert applies ONLY to street tiles, NEVER to satellite */
          ${isDark ? '.street-tiles .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(90%); }' : ''}

          /* Layer toggle pill control */
          .layer-switch-container {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 1000;
            display: flex;
            align-items: center;
            background: ${isDark ? "rgba(18, 18, 20, 0.88)" : "rgba(255, 255, 255, 0.92)"};
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 3px;
            border-radius: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            border: 1px solid ${isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"};
            gap: 2px;
          }
          .layer-btn {
            border: none;
            outline: none;
            background: transparent;
            color: ${isDark ? "#9CA3AF" : "#4B5563"};
            font-size: 11px;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 20px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
          }
          .layer-btn.active {
            background: #3B82F6;
            color: #FFFFFF;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.45);
          }

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
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.55));
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
        <div class="layer-switch-container">
          <button id="btnStreet" class="layer-btn active" onclick="switchLayer('street')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            Street
          </button>
          <button id="btnSat" class="layer-btn" onclick="switchLayer('sat')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
            Satellite
          </button>
        </div>

        <script>
          const points = ${safeLocations};
          const targetId = ${selectedPointId != null ? selectedPointId : "null"};
          const markerMap = {};
          const map = L.map('map', { zoomControl: false });
          L.control.zoom({ position: 'topright' }).addTo(map);

          // Tile Layers: Street (OSM) & Satellite (Esri World Imagery)
          const streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            className: 'street-tiles',
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
          });

          const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            className: 'sat-tiles',
            attribution: '&copy; Esri World Imagery',
            maxZoom: 19
          });

          streetLayer.addTo(map);
          let currentLayerType = 'street';

          window.switchLayer = function(layerType) {
            if (layerType === currentLayerType) return;
            if (layerType === 'sat') {
              map.removeLayer(streetLayer);
              satLayer.addTo(map);
              document.getElementById('btnStreet').classList.remove('active');
              document.getElementById('btnSat').classList.add('active');
              currentLayerType = 'sat';
            } else {
              map.removeLayer(satLayer);
              streetLayer.addTo(map);
              document.getElementById('btnSat').classList.remove('active');
              document.getElementById('btnStreet').classList.add('active');
              currentLayerType = 'street';
            }
          };

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

          function getDistanceM(p1, p2) {
            var R = 6371e3;
            var dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
            var dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((p1.latitude * Math.PI) / 180) * Math.cos((p2.latitude * Math.PI) / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          }

          // Build Popup Content
          var movingPointsList = [];
          function buildPopupContent(idx, title, badge, extraRows) {
            var pt = (movingPointsList.length > 0 && movingPointsList[idx]) ? movingPointsList[idx] : points[idx];
            if (!pt) pt = points[0];
            var timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            var navUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + pt.latitude + ',' + pt.longitude;
            var prevDisabled = idx <= 0 ? 'disabled' : '';
            var nextDisabled = (idx >= movingPointsList.length - 1 || movingPointsList.length <= 1) ? 'disabled' : '';

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
            if (idx < 0 || idx >= movingPointsList.length) return;
            var targetPt = movingPointsList[idx];
            if (markerMap[targetPt.id]) {
              var m = markerMap[targetPt.id];
              map.flyTo(m.getLatLng(), 18, { duration: 0.6 });
              m.openPopup();
            }
          };

          if (points && points.length > 0) {
            // Check if all recorded points for this date are within a 35m indoor stationary cluster
            var maxSpread = 0;
            var origin = points[0];
            for (var k = 1; k < points.length; k++) {
              var dist = getDistanceM(origin, points[k]);
              if (dist > maxSpread) maxSpread = dist;
            }

            // Filter to waypoints that represent true physical movement >= 15m apart
            var movingPoints = [points[0]];
            for (var i = 1; i < points.length; i++) {
              var d = getDistanceM(movingPoints[movingPoints.length - 1], points[i]);
              if (d >= 15) {
                movingPoints.push(points[i]);
              }
            }
            movingPointsList = movingPoints;

            // CASE 1: Stationary / No movement outside 35m cluster:
            // If the entire day's points are within 35 meters, or if movingPoints < 2:
            // DO NOT draw any line across blocks! Show ONLY the single live marker at the house!
            if (maxSpread < 35 || movingPoints.length < 2) {
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
                .bindPopup(buildPopupContent(0, 'Current Position: ${username || "User"}', 'Live (Stationary)', ''), { className: 'custom-popup' })
                .openPopup();

              // Map all points to this marker
              for (var pIdx = 0; pIdx < points.length; pIdx++) {
                markerMap[points[pIdx].id] = marker;
              }
              map.setView([pt.latitude, pt.longitude], 18);
            } else {
              // CASE 2: True physical movement >= 10m!
              // Draw true GPS path directly through the actual coordinates (No artificial car detour loops)
              const pathCoords = movingPoints.map(function(p) { return [p.latitude, p.longitude]; });

              const casingLine = L.polyline(pathCoords, {
                color: '#1E3A8A',
                weight: 7,
                opacity: 0.6,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);

              const polyline = L.polyline(pathCoords, {
                color: '#3B82F6',
                weight: 4,
                opacity: 0.95,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);

              // 1. Add starting marker
              const startPoint = movingPoints[0];
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

              // 2. Add intermediate waypoints with DIRECTION ARROWS (ONLY for moving points, eliminating arrow stacking!)
              for (let i = 1; i < movingPoints.length - 1; i++) {
                const pt = movingPoints[i];
                const speedStr = pt.speed != null ? Math.round(pt.speed * 3.6) + ' km/h' : 'N/A';
                const heading = (pt.heading != null && pt.heading > 0)
                  ? Math.round(pt.heading)
                  : computeBearing(pt, movingPoints[i + 1]);

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
                  buildPopupContent(i, 'Waypoint #' + (i + 1), (i + 1) + '/' + movingPoints.length, extraRows),
                  { className: 'custom-popup' }
                );
                markerMap[pt.id] = wpMarker;
              }

              // 3. Add latest CURRENT LIVE AVATAR with DIRECTION BEAM
              const lastIdx = movingPoints.length - 1;
              const lastPoint = movingPoints[lastIdx];
              const lastHeading = (lastPoint.heading != null && lastPoint.heading > 0)
                ? Math.round(lastPoint.heading)
                : (movingPoints.length >= 2 ? computeBearing(movingPoints[movingPoints.length - 2], lastPoint) : 0);
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

              // Map all raw points to their closest marker so clicking any point in timeline works smoothly
              for (var rawIdx = 0; rawIdx < points.length; rawIdx++) {
                var rawP = points[rawIdx];
                if (!markerMap[rawP.id]) {
                  var closestM = null;
                  var minDist = Infinity;
                  for (var mIdx = 0; mIdx < movingPoints.length; mIdx++) {
                    var mPoint = movingPoints[mIdx];
                    var dist = getDistanceM(rawP, mPoint);
                    if (dist < minDist) {
                      minDist = dist;
                      closestM = markerMap[mPoint.id];
                    }
                  }
                  if (closestM) {
                    markerMap[rawP.id] = closestM;
                  }
                }
              }

              if (targetId && markerMap[targetId]) {
                const m = markerMap[targetId];
                map.setView(m.getLatLng(), 18);
                m.openPopup();
              } else {
                lastMarker.openPopup();
                map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 18 });
              }
            }

            window.addEventListener('message', function(e) {
              try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data && data.focusPointId && markerMap[data.focusPointId]) {
                  const m = markerMap[data.focusPointId];
                  map.flyTo(m.getLatLng(), 18, { duration: 0.8 });
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
