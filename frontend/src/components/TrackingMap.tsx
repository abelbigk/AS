import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { MapPin } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

// Persist selected map layer across coordinate updates & inline/fullscreen switches
let savedMapLayer: "street" | "sat" = "street";

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

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
}

export interface LiveStatus {
  isLive: boolean;
  liveLocation: LiveLocationData | null;
}

interface TrackingMapProps {
  locations: LocationPoint[];
  username?: string;
  selectedPointId?: number | null;
  liveStatus?: LiveStatus | null;
  isFullScreen?: boolean;
  style?: any;
}

export function TrackingMap({
  locations,
  username,
  selectedPointId,
  liveStatus = null,
  isFullScreen = false,
  style,
}: TrackingMapProps) {
  const { theme, colors } = useTheme();
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latestLocationsRef = useRef(locations);
  const latestSelectedIdRef = useRef(selectedPointId);
  const latestLiveStatusRef = useRef(liveStatus);
  latestLocationsRef.current = locations;
  latestSelectedIdRef.current = selectedPointId;
  latestLiveStatusRef.current = liveStatus;

  const htmlContent = useMemo(() => {
    const isDark = theme === "dark";
    const initialLocations = JSON.stringify(latestLocationsRef.current);
    const initialTargetId = latestSelectedIdRef.current != null ? latestSelectedIdRef.current : "null";
    const initialLiveStatus = JSON.stringify(latestLiveStatusRef.current ?? null);
    const initialLayer = savedMapLayer;

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
            width: 44px;
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .avatar-radar {
            position: absolute;
            width: 34px;
            height: 34px;
            bottom: 0px;
            left: 5px;
            border-radius: 50%;
            background: rgba(34, 197, 94, 0.28);
            border: 2px solid #22C55E;
            animation: radarPulse 2s infinite ease-out;
          }
          @keyframes radarPulse {
            0% { transform: scale(0.85); opacity: 0.9; }
            70% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .avatar-heading-beam {
            position: absolute;
            width: 34px;
            height: 34px;
            bottom: 0px;
            left: 5px;
            pointer-events: none;
            filter: drop-shadow(0 2px 4px rgba(34,197,94,0.65));
          }
          .avatar-radar-blue {
            position: absolute;
            inset: 2px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.25);
            border: 2px solid #3B82F6;
            animation: radarPulse 2s infinite ease-out;
          }
          .avatar-drop-svg {
            position: relative;
            z-index: 2;
            filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
            transform-origin: 50% 62%;
            transition: transform 0.35s ease;
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
          <button id="btnStreet" class="layer-btn${initialLayer === "street" ? " active" : ""}" onclick="switchLayer('street')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            Street
          </button>
          <button id="btnSat" class="layer-btn${initialLayer === "sat" ? " active" : ""}" onclick="switchLayer('sat')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
            Satellite
          </button>
        </div>

        <script>
          let points = ${initialLocations};
          let targetId = ${initialTargetId};
          let currentLiveStatus = ${initialLiveStatus};
          const markerMap = {};
          const map = L.map('map', { zoomControl: false });
          L.control.zoom({ position: 'topright' }).addTo(map);
          const routeGroup = L.layerGroup().addTo(map);

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

          let currentLayerType = '${initialLayer}';
          if (currentLayerType === 'sat') {
            satLayer.addTo(map);
          } else {
            streetLayer.addTo(map);
          }

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
            try {
              const msg = JSON.stringify({ type: 'layerChange', layer: currentLayerType });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
              if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
            } catch(e) {}
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

          let hasInitialViewport = false;
          let currentRenderSeq = 0;
          let routeAbortController = null;
          const osrmRouteCache = {};

          function sortPointsChronological(raw) {
            return (raw || []).slice().sort(function(a, b) {
              var ta = new Date(a.timestamp).getTime() || 0;
              var tb = new Date(b.timestamp).getTime() || 0;
              if (ta !== tb) return ta - tb;
              return (a.id || 0) - (b.id || 0);
            });
          }

          function denoisePoints(sorted) {
            if (!sorted || sorted.length <= 2) return sorted || [];
            // 1. Filter out very low accuracy fixes (> 65m) if we have enough accurate points
            var accurate = sorted.filter(function(p) {
              return p.accuracy == null || p.accuracy <= 65;
            });
            var pts = accurate.length >= 2 ? accurate : sorted;

            // 2. Remove genuinely impossible teleport jumps (> 55 m/s = ~200 km/h)
            var speedFiltered = [pts[0]];
            for (var s = 1; s < pts.length; s++) {
              var prevS = speedFiltered[speedFiltered.length - 1];
              var curS = pts[s];
              var dS = getDistanceM(prevS, curS);
              var dtS = Math.max(1, (new Date(curS.timestamp).getTime() - new Date(prevS.timestamp).getTime()) / 1000);
              var impliedS = dS / dtS;
              if (dS > 120 && impliedS > 55) {
                if (s + 1 < pts.length && getDistanceM(curS, pts[s + 1]) < 40 && speedFiltered.length === 1) {
                  speedFiltered[0] = curS;
                }
                continue;
              }
              speedFiltered.push(curS);
            }
            pts = speedFiltered;

            // 3. Remove 1-to-4-point GPS out-and-back glitch loops (e.g. jumps > 50m away and returns within 35m in < 2 mins)
            var cleaned = [pts[0]];
            for (var i = 1; i < pts.length; i++) {
              var prev = cleaned[cleaned.length - 1];
              var cur = pts[i];
              var dPrev = getDistanceM(prev, cur);
              if (dPrev > 50) {
                var tPrev = new Date(prev.timestamp).getTime();
                var returnIdx = -1;
                for (var look = 1; look <= 4 && i + look < pts.length; look++) {
                  var cand = pts[i + look];
                  var dtLook = Math.abs(new Date(cand.timestamp).getTime() - tPrev);
                  if (dtLook <= 120000 && getDistanceM(prev, cand) < 35) {
                    returnIdx = i + look;
                    break;
                  }
                }
                if (returnIdx !== -1) {
                  i = returnIdx - 1;
                  continue;
                }
              }
              cleaned.push(cur);
            }
            return cleaned;
          }

          function extractMovingWaypoints(cleaned) {
            if (!cleaned || cleaned.length === 0) return [];
            // Step >= 25m between waypoints to prevent indoor GPS drift from creating star/spiderweb clusters
            var moving = [cleaned[0]];
            for (var i = 1; i < cleaned.length; i++) {
              var d = getDistanceM(moving[moving.length - 1], cleaned[i]);
              if (d >= 25) {
                moving.push(cleaned[i]);
              }
            }
            // Collapse quick ping-pong bounces (A -> B -> A within 25m of A and < 2 mins)
            if (moving.length >= 3) {
              var collapsed = [moving[0]];
              for (var j = 1; j < moving.length; j++) {
                if (collapsed.length >= 2) {
                  var prev2 = collapsed[collapsed.length - 2];
                  var prev1 = collapsed[collapsed.length - 1];
                  var cur = moving[j];
                  var dt = Math.abs(new Date(cur.timestamp).getTime() - new Date(prev2.timestamp).getTime());
                  if (getDistanceM(prev2, cur) < 25 && getDistanceM(prev1, cur) < 50 && dt < 120000) {
                    collapsed.pop();
                    continue;
                  }
                }
                collapsed.push(moving[j]);
              }
              moving = collapsed;
            }
            // Always ensure the very latest point is represented if >= 25m from start
            var lastRaw = cleaned[cleaned.length - 1];
            if (moving.length >= 2 && moving[moving.length - 1].id !== lastRaw.id) {
              if (getDistanceM(moving[moving.length - 1], lastRaw) >= 15) {
                moving.push(lastRaw);
              } else {
                moving[moving.length - 1] = lastRaw;
              }
            }
            return moving;
          }

          async function fetchOsrmChunk(chunk, profile, signal) {
            var coordsStr = chunk.map(function(p) { return p.longitude + ',' + p.latitude; }).join(';');
            var url = profile === 'driving'
              ? 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson&continue_straight=false'
              : 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/' + coordsStr + '?overview=full&geometries=geojson&continue_straight=false';
            var resp = await fetch(url, { signal: signal });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var json = await resp.json();
            if (json && json.code === 'Ok' && json.routes && json.routes[0] && json.routes[0].geometry && json.routes[0].geometry.coordinates) {
              return json.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
            }
            throw new Error('No route');
          }

          async function getValidRoadPath(waypoints, signal) {
            if (!waypoints || waypoints.length < 2) return null;
            var cacheKey = waypoints.map(function(p) { return p.latitude.toFixed(5) + ',' + p.longitude.toFixed(5); }).join('|');
            if (osrmRouteCache[cacheKey]) return osrmRouteCache[cacheKey];

            var maxSpeed = 0;
            for (var i = 0; i < waypoints.length; i++) {
              if (waypoints[i].speed && waypoints[i].speed > maxSpeed) maxSpeed = waypoints[i].speed;
            }
            var primaryProfile = maxSpeed > 10 ? 'driving' : 'foot';
            var fallbackProfile = primaryProfile === 'foot' ? 'driving' : 'foot';

            var chunkSize = 70;
            var chunks = [];
            for (var start = 0; start < waypoints.length - 1; start += (chunkSize - 1)) {
              var end = Math.min(start + chunkSize, waypoints.length);
              chunks.push(waypoints.slice(start, end));
              if (end === waypoints.length) break;
            }

            async function runWithProfile(profile) {
              var fullCoords = [];
              for (var c = 0; c < chunks.length; c++) {
                var part = await fetchOsrmChunk(chunks[c], profile, signal);
                if (c > 0 && fullCoords.length > 0 && part.length > 0) {
                  part = part.slice(1);
                }
                for (var k = 0; k < part.length; k++) fullCoords.push(part[k]);
              }
              return fullCoords;
            }

            try {
              var coords = await runWithProfile(primaryProfile);
              if (coords.length >= 2) {
                osrmRouteCache[cacheKey] = coords;
                return coords;
              }
            } catch (e) {
              if (e && e.name === 'AbortError') throw e;
            }

            try {
              var fbCoords = await runWithProfile(fallbackProfile);
              if (fbCoords.length >= 2) {
                osrmRouteCache[cacheKey] = fbCoords;
                return fbCoords;
              }
            } catch (e2) {
              if (e2 && e2.name === 'AbortError') throw e2;
            }
            return null;
          }

          function addRouteChevrons(coords, targetGroup) {
            if (!coords || coords.length < 2) return;
            var accumDist = 0;
            var chevronInterval = 110; // meters between decorative street direction arrows
            for (var i = 1; i < coords.length; i++) {
              var p1 = { latitude: coords[i - 1][0], longitude: coords[i - 1][1] };
              var p2 = { latitude: coords[i][0], longitude: coords[i][1] };
              var segDist = getDistanceM(p1, p2);
              accumDist += segDist;
              if (accumDist >= chevronInterval) {
                accumDist = 0;
                var midLat = (p1.latitude + p2.latitude) / 2;
                var midLon = (p1.longitude + p2.longitude) / 2;
                var brg = computeBearing(p1, p2);
                var chevIcon = L.divIcon({
                  className: 'waypoint-marker',
                  html: '<div style="transform: rotate(' + brg + 'deg); pointer-events: none;">' +
                        '<svg viewBox="0 0 24 24" width="12" height="12">' +
                        '<polygon points="12,3 20,19 12,15 4,19" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2"/>' +
                        '</svg></div>',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                });
                L.marker([midLat, midLon], { icon: chevIcon, interactive: false }).addTo(targetGroup);
              }
            }
          }

          function buildGreenDropMarker(liveLoc, fallbackPoint) {
            var userInitial = ('${username || "U"}').charAt(0).toUpperCase();
            var heading = (liveLoc.heading != null && liveLoc.heading >= 0)
              ? Math.round(liveLoc.heading)
              : (fallbackPoint && getDistanceM(fallbackPoint, liveLoc) >= 3
                  ? computeBearing(fallbackPoint, liveLoc)
                  : 0);
            var dropSvg =
              '<svg class="avatar-drop-svg" style="transform: rotate(' + heading + 'deg);" viewBox="0 0 36 44" width="34" height="42">' +
              '  <defs><linearGradient id="dropGradLive" x1="0" y1="0" x2="1" y2="1">' +
              '    <stop offset="0%" stop-color="#22C55E"/><stop offset="100%" stop-color="#15803D"/>' +
              '  </linearGradient></defs>' +
              '  <path d="M18 3 C18 3 5 18.5 5 28 A13 13 0 1 0 31 28 C31 18.5 18 3 18 3 Z" fill="url(#dropGradLive)" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>' +
              '  <text x="18" y="32" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800" font-family="sans-serif" transform="rotate(' + (-heading) + ' 18 28)">' + userInitial + '</text>' +
              '</svg>';
            var liveIcon = L.divIcon({
              className: 'live-avatar-marker',
              html: '<div class="live-avatar-wrap">' +
                    '  <div class="avatar-radar"></div>' +
                    '  ' + dropSvg +
                    '</div>',
              iconSize: [44, 46],
              iconAnchor: [22, 30]
            });
            var spdStr = liveLoc.speed != null && liveLoc.speed >= 0 ? Math.round(liveLoc.speed * 3.6) + ' km/h' : '0 km/h';
            var timeStr = new Date(liveLoc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            var popupHtml =
              '<div class="popup-card">' +
                '<div class="popup-head">' +
                  '<span class="popup-title">${username || "User"}</span>' +
                  '<span class="popup-badge" style="background:rgba(34,197,94,0.2);color:#22C55E;">Live Online</span>' +
                '</div>' +
                '<div class="popup-info-row"><span>Updated:</span> <b>' + timeStr + '</b></div>' +
                '<div class="popup-info-row"><span>Facing:</span> <b>' + heading + '&deg; (' + getCompassName(heading) + ')</b></div>' +
                '<div class="popup-info-row"><span>Speed:</span> <b>' + spdStr + '</b></div>' +
                '<div class="popup-coords-text">' + liveLoc.latitude.toFixed(5) + ', ' + liveLoc.longitude.toFixed(5) + '</div>' +
              '</div>';
            return L.marker([liveLoc.latitude, liveLoc.longitude], { icon: liveIcon, zIndexOffset: 1000 })
              .addTo(routeGroup)
              .bindPopup(popupHtml, { className: 'custom-popup' });
          }

          window.renderRoute = function(newPoints, newTargetId, preserveViewport, newLiveStatus) {
            var seq = ++currentRenderSeq;
            if (routeAbortController) {
              try { routeAbortController.abort(); } catch (e) {}
              routeAbortController = null;
            }

            points = sortPointsChronological(newPoints);
            targetId = newTargetId != null ? newTargetId : null;
            if (newLiveStatus !== undefined) {
              currentLiveStatus = newLiveStatus;
            }
            var isLiveOnline = !!(currentLiveStatus && currentLiveStatus.isLive && currentLiveStatus.liveLocation);

            routeGroup.clearLayers();
            movingPointsList = [];
            for (const k in markerMap) { delete markerMap[k]; }
            if (points && points.length > 0) {
            var cleanedPoints = denoisePoints(points);

            // Check if all cleaned points for this date are within a 35m indoor stationary cluster
            var maxSpread = 0;
            var origin = cleanedPoints[0];
            for (var k = 1; k < cleanedPoints.length; k++) {
              var dist = getDistanceM(origin, cleanedPoints[k]);
              if (dist > maxSpread) maxSpread = dist;
            }

            var movingPoints = extractMovingWaypoints(cleanedPoints);
            movingPointsList = movingPoints;

            // CASE 1: Stationary / No movement outside 35m cluster:
            if (maxSpread < 35 || movingPoints.length < 2) {
              const pt = cleanedPoints[cleanedPoints.length - 1];
              const userInitial = ('${username || "U"}').charAt(0).toUpperCase();
              let marker;
              if (isLiveOnline) {
                // Online: last recorded point becomes a normal arrow/pin, and green water-drop shows live streaming location
                const ptHeading = (pt.heading != null && pt.heading >= 0) ? Math.round(pt.heading) : 0;
                const arrowIcon = L.divIcon({
                  className: 'waypoint-marker',
                  html: '<div class="waypoint-arrow-box" style="transform: rotate(' + ptHeading + 'deg);">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16">' +
                        '<polygon points="12,2 21,20 12,15 3,20" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>' +
                        '</svg></div>',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                marker = L.marker([pt.latitude, pt.longitude], { icon: arrowIcon })
                  .addTo(routeGroup)
                  .bindPopup(buildPopupContent(0, 'Last Recorded: ${username || "User"}', 'Recorded', ''), { className: 'custom-popup' });
                buildGreenDropMarker(currentLiveStatus.liveLocation, pt);
              } else {
                // Offline: last recorded location is blue circle with user's initial
                const blueIcon = L.divIcon({
                  className: 'live-avatar-marker',
                  html: '<div class="live-avatar-wrap" style="width:40px;height:40px;">' +
                        '  <div class="avatar-radar-blue"></div>' +
                        '  <div class="avatar-core"><span>' + userInitial + '</span></div>' +
                        '</div>',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                });
                marker = L.marker([pt.latitude, pt.longitude], { icon: blueIcon })
                  .addTo(routeGroup)
                  .bindPopup(buildPopupContent(0, 'Last Recorded: ${username || "User"}', 'Offline', ''), { className: 'custom-popup' })
                  .openPopup();
              }

              // Map all points to this marker
              for (var pIdx = 0; pIdx < points.length; pIdx++) {
                markerMap[points[pIdx].id] = marker;
              }
              if (!preserveViewport || !hasInitialViewport) {
                var focusPt = isLiveOnline ? currentLiveStatus.liveLocation : pt;
                map.setView([focusPt.latitude, focusPt.longitude], 18);
                hasInitialViewport = true;
              }
            } else {
              // CASE 2: True physical movement!
              // Route along actual streets/paths via OSRM, with immediate preview & seamless replacement
              const lineGroup = L.layerGroup().addTo(routeGroup);
              const rawCoords = movingPoints.map(function(p) { return [p.latitude, p.longitude]; });

              function drawPathGeometry(coords, isPreview) {
                lineGroup.clearLayers();
                L.polyline(coords, {
                  color: '#1E3A8A',
                  weight: isPreview ? 5 : 7,
                  opacity: isPreview ? 0.3 : 0.65,
                  lineJoin: 'round',
                  lineCap: 'round',
                  dashArray: isPreview ? '6, 8' : null
                }).addTo(lineGroup);

                var mainLine = L.polyline(coords, {
                  color: '#3B82F6',
                  weight: isPreview ? 3 : 4.5,
                  opacity: isPreview ? 0.55 : 0.95,
                  lineJoin: 'round',
                  lineCap: 'round',
                  dashArray: isPreview ? '6, 8' : null
                }).addTo(lineGroup);

                if (!isPreview) {
                  addRouteChevrons(coords, lineGroup);
                }
                return mainLine;
              }

              const previewLine = drawPathGeometry(rawCoords, true);

              // 1. Add starting marker
              const startPoint = movingPoints[0];
              const startIcon = L.divIcon({
                className: 'start-pin-wrapper',
                html: '<div class="start-pin"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              const startMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: startIcon })
                .addTo(routeGroup)
                .bindPopup(buildPopupContent(0, 'Trip Start', 'Start', ''), { className: 'custom-popup' });
              markerMap[startPoint.id] = startMarker;

              // 2. Add intermediate waypoints with DIRECTION ARROWS (spaced >= 35m apart so arrows never stack!)
              const lastIdx = movingPoints.length - 1;
              const lastPoint = movingPoints[lastIdx];
              var lastPlacedArrowPt = startPoint;
              for (let i = 1; i < movingPoints.length - 1; i++) {
                const pt = movingPoints[i];
                if (getDistanceM(lastPlacedArrowPt, pt) < 35 || getDistanceM(pt, lastPoint) < 35) {
                  continue;
                }
                lastPlacedArrowPt = pt;
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

                const wpMarker = L.marker([pt.latitude, pt.longitude], { icon: waypointIcon }).addTo(routeGroup);

                var extraRows = '<div class="popup-info-row"><span>Direction:</span> <b>' + heading + '&deg; (' + getCompassName(heading) + ')</b></div>' +
                                '<div class="popup-info-row"><span>Speed:</span> <b>' + speedStr + '</b></div>';

                wpMarker.bindPopup(
                  buildPopupContent(i, 'Waypoint #' + (i + 1), (i + 1) + '/' + movingPoints.length, extraRows),
                  { className: 'custom-popup' }
                );
                markerMap[pt.id] = wpMarker;
              }

              // 3. Add latest recorded point: normal arrow if user is live online (+ green water-drop live avatar), OR blue initial circle if offline
              const lastHeading = (lastPoint.heading != null && lastPoint.heading > 0)
                ? Math.round(lastPoint.heading)
                : (movingPoints.length >= 2 ? computeBearing(movingPoints[movingPoints.length - 2], lastPoint) : 0);
              const userInitial = ('${username || "U"}').charAt(0).toUpperCase();
              const lastSpeedStr = lastPoint.speed != null ? Math.round(lastPoint.speed * 3.6) + ' km/h' : 'N/A';

              let lastMarker;
              if (isLiveOnline) {
                const lastArrowIcon = L.divIcon({
                  className: 'waypoint-marker',
                  html: '<div class="waypoint-arrow-box" style="transform: rotate(' + lastHeading + 'deg);">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16">' +
                        '<polygon points="12,2 21,20 12,15 3,20" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>' +
                        '</svg></div>',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                lastMarker = L.marker([lastPoint.latitude, lastPoint.longitude], { icon: lastArrowIcon }).addTo(routeGroup);
                var lastExtraRows = '<div class="popup-info-row"><span>Direction:</span> <b>' + lastHeading + '&deg; (' + getCompassName(lastHeading) + ')</b></div>' +
                                    '<div class="popup-info-row"><span>Speed:</span> <b>' + lastSpeedStr + '</b></div>';
                lastMarker.bindPopup(
                  buildPopupContent(lastIdx, 'Last Recorded: ${username || "User"}', 'Recorded', lastExtraRows),
                  { className: 'custom-popup' }
                );
                buildGreenDropMarker(currentLiveStatus.liveLocation, lastPoint);
              } else {
                const blueAvatarIcon = L.divIcon({
                  className: 'live-avatar-marker',
                  html: '<div class="live-avatar-wrap" style="width:40px;height:40px;">' +
                        '  <div class="avatar-radar-blue"></div>' +
                        '  <div class="avatar-heading-beam" style="top:4px;left:4px;bottom:auto;width:32px;height:32px;transform: rotate(' + lastHeading + 'deg);">' +
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
                lastMarker = L.marker([lastPoint.latitude, lastPoint.longitude], { icon: blueAvatarIcon }).addTo(routeGroup);
                var offExtraRows = '<div class="popup-info-row"><span>Direction:</span> <b>' + lastHeading + '&deg; (' + getCompassName(lastHeading) + ')</b></div>' +
                                   '<div class="popup-info-row"><span>Speed:</span> <b>' + lastSpeedStr + '</b></div>';
                lastMarker.bindPopup(
                  buildPopupContent(lastIdx, 'Last Recorded: ${username || "User"}', 'Offline', offExtraRows),
                  { className: 'custom-popup' }
                );
              }
              markerMap[lastPoint.id] = lastMarker;

              // Map all raw points to their closest placed marker so clicking any point in timeline works smoothly
              var placedMarkers = [];
              for (var mkId in markerMap) {
                if (markerMap[mkId]) placedMarkers.push({ id: mkId, marker: markerMap[mkId] });
              }
              for (var rawIdx = 0; rawIdx < points.length; rawIdx++) {
                var rawP = points[rawIdx];
                if (!markerMap[rawP.id] && placedMarkers.length > 0) {
                  var closestM = placedMarkers[0].marker;
                  var minDist = Infinity;
                  for (var pmIdx = 0; pmIdx < placedMarkers.length; pmIdx++) {
                    var pmLatLng = placedMarkers[pmIdx].marker.getLatLng();
                    var dist = getDistanceM(rawP, { latitude: pmLatLng.lat, longitude: pmLatLng.lng });
                    if (dist < minDist) {
                      minDist = dist;
                      closestM = placedMarkers[pmIdx].marker;
                    }
                  }
                  markerMap[rawP.id] = closestM;
                }
              }

              if (targetId && markerMap[targetId]) {
                const m = markerMap[targetId];
                map.setView(m.getLatLng(), 18);
                m.openPopup();
              } else if (!preserveViewport || !hasInitialViewport) {
                lastMarker.openPopup();
                map.fitBounds(previewLine.getBounds(), { padding: [40, 40], maxZoom: 18 });
              }
              hasInitialViewport = true;

              // Async upgrade to valid OSRM street/path route
              routeAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
              getValidRoadPath(movingPoints, routeAbortController ? routeAbortController.signal : undefined)
                .then(function(roadCoords) {
                  if (seq !== currentRenderSeq) return;
                  if (roadCoords && roadCoords.length >= 2) {
                    var roadLine = drawPathGeometry(roadCoords, false);
                    if (!preserveViewport && !targetId) {
                      map.fitBounds(roadLine.getBounds(), { padding: [40, 40], maxZoom: 18 });
                    }
                  } else {
                    drawPathGeometry(rawCoords, false);
                  }
                })
                .catch(function(err) {
                  if (err && err.name === 'AbortError') return;
                  if (seq !== currentRenderSeq) return;
                  drawPathGeometry(rawCoords, false);
                });
            }
          } else if (isLiveOnline) {
            buildGreenDropMarker(currentLiveStatus.liveLocation, null);
            if (!preserveViewport || !hasInitialViewport) {
              map.setView([currentLiveStatus.liveLocation.latitude, currentLiveStatus.liveLocation.longitude], 18);
              hasInitialViewport = true;
            }
          } else {
            if (!hasInitialViewport) {
              // Default center if no coordinates
              map.setView([9.02, 38.74], 12);
              hasInitialViewport = true;
            }
          }
          };

          window.renderRoute(points, targetId, false, currentLiveStatus);

            window.addEventListener('message', function(e) {
              try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data && data.type === 'updateRoute') {
                  window.renderRoute(data.locations, data.selectedPointId, true, data.liveStatus);
                } else if (data && data.focusPointId && markerMap[data.focusPointId]) {
                  const m = markerMap[data.focusPointId];
                  map.flyTo(m.getLatLng(), 18, { duration: 0.8 });
                  m.openPopup();
                }
              } catch(err) {}
            });
        </script>
      </body>
      </html>
    `;
  }, [theme, username]);

  // Push new coordinates / selected point / live status in-place without reloading WebView (preserves Satellite layer!)
  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            type: "updateRoute",
            locations,
            selectedPointId: selectedPointId ?? null,
            liveStatus: liveStatus ?? null,
          }),
          "*"
        );
      } catch {}
    } else if (webViewRef.current) {
      const payload = JSON.stringify(locations);
      const target = selectedPointId != null ? selectedPointId : "null";
      const livePayload = JSON.stringify(liveStatus ?? null);
      webViewRef.current.injectJavaScript(
        `window.renderRoute && window.renderRoute(${payload}, ${target}, true, ${livePayload}); true;`
      );
    }
  }, [locations, selectedPointId, liveStatus]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMsg = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type === "layerChange" && (data.layer === "street" || data.layer === "sat")) {
          savedMapLayer = data.layer;
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

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
          ref={iframeRef}
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
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "layerChange" && (data.layer === "street" || data.layer === "sat")) {
              savedMapLayer = data.layer;
            }
          } catch {}
        }}
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
