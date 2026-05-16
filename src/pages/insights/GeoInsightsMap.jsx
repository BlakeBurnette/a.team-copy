import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import { cellToBoundary, cellToLatLng } from 'h3-js';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN || '';
if (mapboxgl.setTelemetryEnabled) {
  mapboxgl.setTelemetryEnabled(false);
}
let MAPBOX_EVENTS_PATCHED = false;
const DEBUG = false;

const LAYERS = [
  { key: 'customers', label: 'Customers', metric: 'customer_count', color: ['rgba(60,130,200,0.8)', 'rgba(20,90,160,0.9)'] },
  { key: 'time', label: 'Time Spent', metric: 'total_minutes', color: ['rgba(200,120,70,0.8)', 'rgba(170,90,40,0.9)'] },
  { key: 'income', label: 'Income', metric: 'total_net_cents', color: ['rgba(60,180,120,0.8)', 'rgba(30,140,90,0.9)'] },
];

function validCoord(lng, lat) {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function isValidLngLat(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) return false;
  const [lng, lat] = pair.map(Number);
  return validCoord(lng, lat);
}

function toNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildFeatureCollection(rows, metricKey) {
  const features = [];
  for (const r of rows || []) {
    const cell = r.h3_cell || r.h3 || r.cell;
    if (!cell) continue;
    let boundary = [];
    let centroid = null;
    try {
      boundary = cellToBoundary(cell, true) || [];
      centroid = cellToLatLng(cell) || null; // [lat, lng]
    } catch (e) {
      continue;
    }
    const coordsA = boundary.map(([lat, lng]) => [lng, lat]).filter(isValidLngLat);
    const coordsB = boundary.map(([lng, lat]) => [lng, lat]).filter(isValidLngLat);
    const candidates = [
      { id: 'A', coords: coordsA, note: 'lat,lng->lng,lat' },
      { id: 'B', coords: coordsB, note: 'lng,lat->lng,lat' },
    ].filter((c) => c.coords.length === boundary.length && c.coords.length >= 3);
    if (!candidates.length) {
      continue;
    }
    let chosen = candidates[0];
    if (centroid && candidates.length > 1) {
      const [centLat, centLng] = centroid;
      const score = (p) => Math.abs(p[0] - centLng) + Math.abs(p[1] - centLat);
      const scoreA = score(candidates[0].coords[0]);
      const scoreB = score(candidates[1].coords[0]);
      chosen = scoreA <= scoreB ? candidates[0] : candidates[1];
    }
    const coords = chosen.coords.slice();
    coords.push(coords[0]);
    let metricVal = toNum(r[metricKey], 0);
    if (metricKey === 'total_minutes' && (!metricVal || metricVal === 0) && Number(r.jobs_completed_count || 0) > 0) {
      metricVal = toNum(r.jobs_completed_count, 0);
    }
    const resolution = toNum(r.resolution || r.res || 9, 9);
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: {
        h3_cell: cell,
        resolution,
        [metricKey]: metricVal,
        customer_count: toNum(r.customer_count),
        total_minutes: toNum(r.total_minutes),
        total_net_cents: toNum(r.total_net_cents),
        jobs_completed_count: toNum(r.jobs_completed_count),
        invoice_count: toNum(r.invoice_count),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function buildPointCollection(rows, metricKey) {
  const features = [];
  for (const r of rows || []) {
    const cell = r.h3_cell || r.h3 || r.cell;
    if (!cell) continue;
    let latLng = null;
    try {
      latLng = cellToLatLng(cell); // [lat, lng]
    } catch {}
    if (!Array.isArray(latLng) || latLng.length !== 2) continue;
    const [lat, lng] = latLng.map(Number);
    if (!validCoord(lng, lat)) continue;
    let weight = toNum(r[metricKey], 0);
    if (metricKey === 'total_minutes' && (!weight || weight === 0) && Number(r.jobs_completed_count || 0) > 0) {
      weight = toNum(r.jobs_completed_count, 0);
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        h3_cell: cell,
        weight,
        customer_count: toNum(r.customer_count),
        total_minutes: toNum(r.total_minutes),
        total_net_cents: toNum(r.total_net_cents),
        jobs_completed_count: toNum(r.jobs_completed_count),
        invoice_count: toNum(r.invoice_count),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function maxMetric(fc, key) {
  return fc?.features?.reduce((m, f) => Math.max(m, Number(f.properties?.[key] || 0)), 0) || 0;
}

export default function GeoInsightsMap() {
  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const resizeHandler = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ customers: null, time: null, income: null });

  const [visible, setVisible] = useState({ customers: true, time: false, income: false });
  const [opacity, setOpacity] = useState({ customers: 0.7, time: 0.6, income: 0.6 });
  const [hover, setHover] = useState(null);
  const [infoMsg, setInfoMsg] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [fitted, setFitted] = useState(false);
  const [renderStyle, setRenderStyle] = useState('heat'); // 'heat' | 'hex'

  useEffect(() => { setFitted(false); }, [renderStyle]);

  useEffect(() => {
    if (MAPBOX_EVENTS_PATCHED) return;
    MAPBOX_EVENTS_PATCHED = true;
    if (typeof window !== 'undefined' && window.fetch) {
      const origFetch = window.fetch.bind(window);
      window.fetch = (...args) => {
        const urlArg = args[0];
        const urlStr =
          typeof urlArg === 'string' ? urlArg
            : (urlArg && typeof urlArg.url === 'string') ? urlArg.url
            : '';
        if (urlStr.includes('events.mapbox.com')) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return origFetch(...args);
      };
    }
    if (typeof window !== 'undefined' && window.XMLHttpRequest) {
      const OrigXHR = window.XMLHttpRequest;
      function WrappedXHR() {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        xhr.open = function(method, url, ...rest) {
          const urlStr = typeof url === 'string' ? url : '';
          if (urlStr.includes('events.mapbox.com')) {
            // short-circuit telemetry calls
            return origOpen.call(xhr, method, 'data:,', ...rest);
          }
          return origOpen.call(xhr, method, url, ...rest);
        };
        return xhr;
      }
      window.XMLHttpRequest = WrappedXHR;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [c, t, i] = await Promise.all([
          axios.get('/api/insights/geo/customers', { params: { res: 9 }, withCredentials: true }).catch(() => null),
          axios.get('/api/insights/geo/time', { params: { res: 9, range: 12 }, withCredentials: true }).catch(() => null),
          axios.get('/api/insights/geo/income', { params: { res: 9, range: 12 }, withCredentials: true }).catch(() => null),
        ]);
        if (cancelled) return;
        const rows = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.items) ? res.data.items : []);
        const customersFc = buildFeatureCollection(rows(c), 'customer_count');
        const timeFc = buildFeatureCollection(rows(t), 'total_minutes');
        const incomeFc = buildFeatureCollection(rows(i), 'total_net_cents');
        const customersPts = buildPointCollection(rows(c), 'customer_count');
        const timePts = buildPointCollection(rows(t), 'total_minutes');
        const incomePts = buildPointCollection(rows(i), 'total_net_cents');
        if (DEBUG) {
          const bboxOf = (fc) => {
            if (!fc?.features?.length) return null;
            const ring = fc.features[0]?.geometry?.coordinates?.[0] || [];
            const lngs = ring.map((p) => p[0]);
            const lats = ring.map((p) => p[1]);
            return { minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
          };
        }
        setData({
          customers: { hex: customersFc, pts: customersPts },
          time: { hex: timeFc, pts: timePts },
          income: { hex: incomeFc, pts: incomePts },
        });
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || 'Failed to load geo insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  const computeBounds = useCallback((fcList) => {
    const bounds = new mapboxgl.LngLatBounds();
    let hasAny = false;
    (fcList || []).forEach((fc) => {
      if (!fc?.features?.length) return;
      fc.features.forEach((f) => {
        if (f.geometry?.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates || [];
          if (validCoord(lng, lat)) {
            bounds.extend([Number(lng), Number(lat)]);
            hasAny = true;
          }
          return;
        }
        const ring = f.geometry?.coordinates?.[0] || [];
        ring.forEach(([lng, lat]) => {
          if (validCoord(lng, lat)) {
            bounds.extend([Number(lng), Number(lat)]);
            hasAny = true;
          }
        });
      });
    });
    return hasAny ? bounds : null;
  }, []);

  const enabledDatasets = useMemo(
    () => LAYERS.map((l) => {
      const entry = data[l.key];
      if (!visible[l.key] || !entry) return null;
      const fc = renderStyle === 'heat' ? entry.pts : entry.hex;
      return fc?.features?.length ? fc : null;
    }).filter(Boolean),
    [data, visible, renderStyle]
  );

  useEffect(() => {
    if (!mapEl.current || mapRef.current || !MAPBOX_TOKEN) return;
    mapRef.current = new mapboxgl.Map({
      container: mapEl.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-98.5, 39.8],
      zoom: 3,
      transformRequest: (url) => {
        if (url.includes('events.mapbox.com')) {
          return { url: 'data:,' };
        }
        return { url };
      },
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current.on('load', () => {
      setMapLoaded(true);
      mapRef.current?.resize();
      resizeHandler.current = () => mapRef.current?.resize();
      window.addEventListener('resize', resizeHandler.current);
    });
    mapRef.current.on('error', (e) => {
      if (DEBUG) console.log('[GeoInsights] map error', e?.error || e);
    });

    mapRef.current.on('mousemove', (e) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const layerIds = LAYERS.map((l) => renderStyle === 'heat' ? `${l.key}-circle` : `${l.key}-fill`).filter((id) => map.getLayer(id));
      if (!layerIds.length) { setHover(null); return; }
      const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
      if (!feats.length) { setHover(null); return; }
      const props = feats[0].properties || {};
      setHover({
        lngLat: e.lngLat,
        metrics: {
          customer_count: props.customer_count ? Number(props.customer_count) : props.weight ? Number(props.weight) : null,
          total_minutes: props.total_minutes ? Number(props.total_minutes) : props.weight ? Number(props.weight) : null,
          total_net_cents: props.total_net_cents ? Number(props.total_net_cents) : props.weight ? Number(props.weight) : null,
        },
      });
    });
    mapRef.current.on('mouseleave', () => setHover(null));
    return () => {
      if (resizeHandler.current) window.removeEventListener('resize', resizeHandler.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded?.()) return;
    updateLayers();

    function updateLayers() {
      LAYERS.forEach((layer) => {
        const sourceId = renderStyle === 'heat' ? `${layer.key}-pts` : `${layer.key}-source`;
        const heatId = `${layer.key}-heat`;
        const circleId = `${layer.key}-circle`;
        const layerId = `${layer.key}-fill`;
        const outlineId = `${layer.key}-line`;
        const entry = data[layer.key];
        const fc = renderStyle === 'heat' ? entry?.pts : entry?.hex;
        if (fc) {
          if (map.getSource(sourceId)) {
            map.getSource(sourceId).setData(fc);
          } else {
            map.addSource(sourceId, { type: 'geojson', data: fc });
          }

          if (renderStyle === 'heat') {
            const maxVal = maxMetric(fc, 'weight') || 1;
            const weight = ['interpolate', ['linear'], ['get', 'weight'],
              0, 0,
              maxVal, 1,
            ];
            if (!map.getLayer(heatId)) {
              map.addLayer({
                id: heatId,
                type: 'heatmap',
                source: sourceId,
                paint: {
                  'heatmap-weight': weight,
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 9, 1.4, 12, 2],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 9, 32, 12, 48],
                  'heatmap-opacity': opacity[layer.key],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(255,255,255,0)',
                    0.2, layer.color[0],
                    0.8, layer.color[1],
                  ],
                },
              });
            } else {
              map.setPaintProperty(heatId, 'heatmap-weight', weight);
              map.setPaintProperty(heatId, 'heatmap-opacity', opacity[layer.key]);
            }
            if (!map.getLayer(circleId)) {
              map.addLayer({
                id: circleId,
                type: 'circle',
                source: sourceId,
                paint: {
                  'circle-radius': 6,
                  'circle-opacity': 0,
                },
              });
            }
            map.setLayoutProperty(heatId, 'visibility', visible[layer.key] ? 'visible' : 'none');
            if (map.getLayer(circleId)) map.setLayoutProperty(circleId, 'visibility', visible[layer.key] ? 'visible' : 'none');
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getLayer(outlineId)) map.removeLayer(outlineId);
          } else {
            const maxVal = maxMetric(fc, layer.metric) || 1;
            const color = ['interpolate', ['linear'], ['get', layer.metric],
              0, layer.color[0],
              maxVal, layer.color[1],
            ];
            if (!map.getLayer(layerId)) {
              map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                  'fill-color': color,
                  'fill-opacity': opacity[layer.key],
                },
              });
            }
            if (!map.getLayer(outlineId)) {
              map.addLayer({
                id: outlineId,
                type: 'line',
                source: sourceId,
                paint: {
                  'line-color': layer.color[1],
                  'line-width': 0.8,
                  'line-opacity': opacity[layer.key],
                },
              });
            }
            map.setPaintProperty(layerId, 'fill-color', color);
            map.setPaintProperty(layerId, 'fill-opacity', opacity[layer.key]);
            if (map.getLayer(outlineId)) {
              map.setPaintProperty(outlineId, 'line-color', layer.color[1]);
              map.setPaintProperty(outlineId, 'line-opacity', opacity[layer.key]);
            }
            map.setLayoutProperty(layerId, 'visibility', visible[layer.key] ? 'visible' : 'none');
            if (map.getLayer(outlineId)) map.setLayoutProperty(outlineId, 'visibility', visible[layer.key] ? 'visible' : 'none');
            if (map.getLayer(heatId)) map.removeLayer(heatId);
            if (map.getLayer(circleId)) map.removeLayer(circleId);
          }
        } else {
          if (map.getLayer(heatId)) map.removeLayer(heatId);
          if (map.getLayer(circleId)) map.removeLayer(circleId);
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer(outlineId)) map.removeLayer(outlineId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      });

      if (!fitted) {
        const bounds = computeBounds(enabledDatasets);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 12, duration: 0 });
          setFitted(true);
        }
      }
    }
  }, [data, visible, opacity, mapLoaded, fitted, computeBounds, enabledDatasets, renderStyle]);

  const fitToData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;
    const b = computeBounds(enabledDatasets);
    if (!b) {
      setInfoMsg('No geo data yet.');
      setTimeout(() => setInfoMsg(''), 2500);
      return;
    }
    map.fitBounds(b, { padding: 40, maxZoom: 12 });
    setFitted(true);
  }, [computeBounds, enabledDatasets, mapLoaded]);

  const centerNearMe = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;
    if (!navigator?.geolocation) {
      setInfoMsg('Location is disabled for this site. Enable it in browser settings to center the map.');
      setTimeout(() => setInfoMsg(''), 3200);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const miles = 25;
        const latDelta = miles / 69;
        const lngDelta = miles / (69 * Math.cos((lat * Math.PI) / 180));
        const bounds = [[lng - lngDelta, lat - latDelta], [lng + lngDelta, lat + latDelta]];
        map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
        setFitted(true);
      },
      () => {
        setInfoMsg('Location is disabled for this site. Enable it in browser settings to center the map.');
        setTimeout(() => setInfoMsg(''), 3200);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-white border rounded-lg shadow p-4">
        <div className="text-sm text-red-600">Mapbox token missing. Set VITE_MAPBOX_TOKEN to enable Geo Insights.</div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-semibold">Geo Insights</div>
          <div className="text-sm text-neutral-600">H3 overlays for customers, time spent, and income.</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {LAYERS.map((l) => (
            <label key={l.key} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={visible[l.key]} onChange={(e) => setVisible((v) => ({ ...v, [l.key]: e.target.checked }))} />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm flex-wrap">
        <button
          type="button"
          onClick={fitToData}
          className="px-3 py-1.5 border rounded bg-white hover:bg-neutral-50"
        >
          Fit to data
        </button>
        <button
          type="button"
          onClick={centerNearMe}
          className="px-3 py-1.5 border rounded bg-white hover:bg-neutral-50"
        >
          Center near me
        </button>
        <div className="inline-flex items-center gap-2">
          <span>Render style:</span>
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="render-style" checked={renderStyle === 'heat'} onChange={() => setRenderStyle('heat')} />
            Smooth heatmap
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="render-style" checked={renderStyle === 'hex'} onChange={() => setRenderStyle('hex')} />
            Hex cells
          </label>
        </div>
        {infoMsg ? <span className="text-xs text-neutral-600">{infoMsg}</span> : null}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {LAYERS.map((l) => (
          <label key={l.key} className="flex items-center gap-2">
            <span className="w-32 text-neutral-700">{l.label} opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity[l.key]}
              onChange={(e) => setOpacity((o) => ({ ...o, [l.key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>

      {error ? (
        <div className="text-sm text-red-600 flex items-center gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()} className="px-3 py-1 border rounded">Retry</button>
        </div>
      ) : loading && !(data.customers || data.time || data.income) ? (
        <div className="text-sm text-neutral-700">Loading map…</div>
      ) : !(
        (renderStyle === 'heat'
          ? (data.customers?.pts?.features?.length || data.time?.pts?.features?.length || data.income?.pts?.features?.length)
          : (data.customers?.hex?.features?.length || data.time?.hex?.features?.length || data.income?.hex?.features?.length))
      ) ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700">
          <span>
            No geo insights yet. Add customer addresses to enable geo analytics. Once properties are geocoded and jobs/invoices exist, your heatmaps will appear here.
          </span>
          <a
            href="/app/customers"
            className="px-3 py-1.5 border rounded bg-white hover:bg-neutral-50 text-neutral-800"
          >
            Complete onboarding addresses
          </a>
        </div>
      ) : null}

      <div className="relative h-[520px] border rounded-lg overflow-hidden">
        <div ref={mapEl} className="absolute inset-0" style={{ minHeight: 420 }} />
        {hover && (
          <div className="absolute bottom-2 left-2 bg-white/90 border rounded-lg px-3 py-2 text-xs shadow">
            <div className="font-semibold mb-1">Cell</div>
            {hover.metrics.customer_count != null && <div>Customers: {hover.metrics.customer_count}</div>}
            {hover.metrics.total_minutes != null && <div>Time spent: {hover.metrics.total_minutes} min</div>}
            {hover.metrics.total_net_cents != null && (
              <div>Income: ${(Number(hover.metrics.total_net_cents || 0) / 100).toFixed(2)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
