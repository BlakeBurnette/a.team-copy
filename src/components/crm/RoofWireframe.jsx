import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ── colour palette ─────────────────────────────────────────── */
const COLORS = {
  bg:       '#0a0a1a',
  grid:     'rgba(0, 255, 255, 0.04)',
  ridge:    '#00ffff',
  valley:   '#ff00ff',
  eave:     '#00ff88',
  obstacle: '#ff8800',
  text:     '#c0f0ff',
  dimText:  'rgba(160, 220, 255, 0.5)',
  scanLine: 'rgba(0, 255, 255, 0.35)',
};

/* Helper: load an image as a promise */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/* pitch -> fill colour (blue=flat, purple=moderate, red=steep) */
function pitchFill(pitchDeg) {
  if (pitchDeg <= 15) return 'rgba(0, 100, 255, 0.08)';
  if (pitchDeg <= 30) return 'rgba(120, 0, 255, 0.08)';
  if (pitchDeg <= 45) return 'rgba(200, 0, 120, 0.08)';
  return 'rgba(255, 0, 0, 0.10)';
}

function pitchStroke(pitchDeg) {
  if (pitchDeg <= 15) return 'rgba(0, 100, 255, 0.25)';
  if (pitchDeg <= 30) return 'rgba(120, 0, 255, 0.25)';
  if (pitchDeg <= 45) return 'rgba(200, 0, 120, 0.25)';
  return 'rgba(255, 0, 0, 0.30)';
}

/* format helpers */
function fmtNumber(n) {
  return n != null ? n.toLocaleString() : '--';
}

function fmtImageryDate(d) {
  if (!d) return null;
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* point-in-polygon (ray-cast) for hover detection */
function pointInRect(px, py, bb) {
  const [tl, br] = bb;
  return px >= tl[0] && px <= br[0] && py >= tl[1] && py <= br[1];
}

/* ── main component ─────────────────────────────────────────── */
export default function RoofWireframe({ geometry, address, loading, error }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const scanRef = useRef(null);
  const satImgRef = useRef(null);
  const satLoadedRef = useRef(false);
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  /* Pre-decode RGB pixel data or load satellite fallback */
  useEffect(() => {
    satImgRef.current = null;
    satLoadedRef.current = false;

    const rgb = geometry?.rgb_base64;
    if (rgb && rgb.includes(':')) {
      // Format: "WxH:base64data"
      try {
        const [dims, b64] = rgb.split(':');
        const [rw, rh] = dims.split('x').map(Number);
        const binary = atob(b64);
        const bytes = new Uint8ClampedArray(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        // Create an offscreen canvas to hold the image
        const offscreen = document.createElement('canvas');
        offscreen.width = rw;
        offscreen.height = rh;
        const octx = offscreen.getContext('2d');
        const imgData = new ImageData(bytes, rw, rh);
        octx.putImageData(imgData, 0, 0);
        satImgRef.current = offscreen;
        satLoadedRef.current = true;
      } catch (e) {
        console.warn('[RoofWireframe] Failed to decode RGB data:', e);
        satLoadedRef.current = true;
      }
      return;
    }

    // Fallback: load satellite Static Map URL
    const url = geometry?.satellite_url;
    if (!url) { satLoadedRef.current = true; return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { satImgRef.current = img; satLoadedRef.current = true; };
    img.onerror = () => { satLoadedRef.current = true; };
    img.src = url;
  }, [geometry?.rgb_base64, geometry?.satellite_url]);

  /* ── aspect ratio from geometry ─────────────────────────── */
  const aspectRatio = geometry
    ? (geometry.height / geometry.width) * 100
    : 56.25; // default 16:9

  /* ── main draw routine ──────────────────────────────────── */
  const draw = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      if (!canvas || !geometry) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const features = geometry.features || {};

      /* background — satellite image if loaded, dark fallback */
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      if (satImgRef.current) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(satImgRef.current, 0, 0, w, h);
        ctx.globalAlpha = 1.0;
        // Darken slightly so wireframe pops
        ctx.fillStyle = 'rgba(0, 0, 20, 0.25)';
        ctx.fillRect(0, 0, w, h);
      } else {
        /* subtle grid when no satellite */
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        const gridSpacing = 20;
        for (let x = 0; x < w; x += gridSpacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += gridSpacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }

      /* ── helper: draw glowing polyline ── */
      const drawGlow = (points, color, lineWidth = 2, closePath = false) => {
        if (!points || points.length < 2) return;
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0][0] * w, points[0][1] * h);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i][0] * w, points[i][1] * h);
        }
        if (closePath) ctx.closePath();
        ctx.stroke();
        /* second pass for extra bloom */
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.restore();
      };

      /* ── segment fills ── */
      const segments = geometry.segments || [];
      segments.forEach((seg, idx) => {
        if (!seg.bounding_box) return;
        const [[x1, y1], [x2, y2]] = seg.bounding_box;
        const isHovered = hoveredSeg === idx;

        ctx.save();
        ctx.fillStyle = isHovered
          ? pitchFill(seg.pitch_degrees).replace(/[\d.]+\)$/, '0.22)')
          : pitchFill(seg.pitch_degrees);
        ctx.fillRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);

        /* segment boundary */
        ctx.strokeStyle = isHovered
          ? 'rgba(0, 255, 255, 0.4)'
          : pitchStroke(seg.pitch_degrees);
        ctx.lineWidth = isHovered ? 1.5 : 0.8;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
        ctx.setLineDash([]);
        ctx.restore();
      });

      /* ── eaves (outer boundary) ── */
      (features.eaves || []).forEach((e) => {
        drawGlow(e.points, COLORS.eave, e.is_outer ? 2.5 : 1.5, true);
      });

      /* ── ridgelines ── */
      (features.ridges || []).forEach((r) => {
        drawGlow(r.points, COLORS.ridge, 2.5);
      });

      /* ── valleys ── */
      (features.valleys || []).forEach((v) => {
        drawGlow(v.points, COLORS.valley, 2);
      });

      /* ── obstacles (pulsing) ── */
      const pulse = 1 + 0.2 * Math.sin((time || 0) / 400);
      (features.obstacles || []).forEach((ob) => {
        const cx = ob.center[0] * w;
        const cy = ob.center[1] * h;
        const r = (ob.radius || 0.015) * Math.min(w, h) * pulse;

        ctx.save();
        /* outer glow ring */
        ctx.shadowBlur = 14;
        ctx.shadowColor = COLORS.obstacle;
        ctx.strokeStyle = COLORS.obstacle;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin((time || 0) / 400);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        ctx.stroke();

        /* solid circle */
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = COLORS.obstacle;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        /* label */
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ob.type || '?', cx, cy + r + 12);
        ctx.restore();
      });

      /* ── segment labels ── */
      segments.forEach((seg, idx) => {
        if (!seg.center) return;
        const cx = seg.center[0] * w;
        const cy = seg.center[1] * h;
        const isHovered = hoveredSeg === idx;

        ctx.save();
        ctx.shadowBlur = isHovered ? 6 : 3;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
        ctx.fillStyle = isHovered ? '#ffffff' : COLORS.text;
        ctx.font = isHovered ? 'bold 11px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(seg.pitch_ratio || '--', cx, cy - 7);
        ctx.font = isHovered ? '10px monospace' : '9px monospace';
        ctx.fillStyle = isHovered ? '#e0f0ff' : COLORS.dimText;
        ctx.shadowBlur = 0;
        ctx.fillText(`${fmtNumber(seg.area_sqft)} ft²`, cx, cy + 7);
        if (seg.direction) {
          ctx.fillText(seg.direction, cx, cy + 19);
        }
        ctx.restore();
      });

      /* schedule next frame for obstacle animation */
      animRef.current = requestAnimationFrame(draw);
    },
    [geometry, hoveredSeg],
  );

  /* ── start / stop animation loop ────────────────────────── */
  useEffect(() => {
    if (!geometry) return;
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw, geometry]);

  /* ── loading scan-line animation ────────────────────────── */
  useEffect(() => {
    if (!loading) {
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawScan = (time) => {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      /* grid */
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      /* scanning line */
      const y = ((time / 15) % h);
      const grad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
      grad.addColorStop(0.5, COLORS.scanLine);
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 30, w, 60);

      /* bright centre line */
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.ridge;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* label */
      ctx.fillStyle = COLORS.dimText;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ANALYZING ROOF GEOMETRY...', w / 2, h / 2);

      scanRef.current = requestAnimationFrame(drawScan);
    };
    scanRef.current = requestAnimationFrame(drawScan);
    return () => {
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
    };
  }, [loading]);

  /* ── mouse hover for segment detection ──────────────────── */
  const handleMouseMove = useCallback(
    (e) => {
      if (!geometry || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      const segments = geometry.segments || [];
      let found = null;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.bounding_box && pointInRect(nx, ny, seg.bounding_box)) {
          found = i;
          break;
        }
      }

      setHoveredSeg(found);

      if (found !== null) {
        const seg = segments[found];
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          seg,
          idx: found,
        });
      } else {
        setTooltip(null);
      }
    },
    [geometry],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSeg(null);
    setTooltip(null);
  }, []);

  /* ── build stats ────────────────────────────────────────── */
  const stats = geometry
    ? {
        squares: geometry.total_squares,
        sqft: geometry.total_sqft,
        segCount: (geometry.segments || []).length,
        obstCount: ((geometry.features || {}).obstacles || []).length,
        imagery: fmtImageryDate(geometry.imagery_date),
        avgPitch:
          geometry.segments && geometry.segments.length > 0
            ? geometry.segments[0].pitch_ratio
            : '--',
      }
    : null;

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="w-full" style={{ fontFamily: 'monospace' }}>
      {/* header bar */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#0d0d22' }}>
        <span className="text-sm truncate" style={{ color: COLORS.text }}>
          {address || 'Roof Wireframe'}
        </span>
        {geometry?.imagery_date && (
          <span className="text-xs ml-3 flex-shrink-0" style={{ color: COLORS.dimText }}>
            Imagery: {fmtImageryDate(geometry.imagery_date)}
          </span>
        )}
      </div>

      {/* canvas container */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ paddingBottom: `${aspectRatio}%`, background: COLORS.bg }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: hoveredSeg !== null ? 'pointer' : 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,26,0.92)' }}>
            <p className="text-red-400 text-sm text-center px-6">{error}</p>
          </div>
        )}

        {/* empty state */}
        {!geometry && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: COLORS.bg }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-30">
              <path d="M20 4L36 18V36H4V18L20 4Z" stroke={COLORS.ridge} strokeWidth="1.5" />
              <path d="M4 18L20 10L36 18" stroke={COLORS.ridge} strokeWidth="1.5" />
            </svg>
            <p className="text-xs" style={{ color: COLORS.dimText }}>
              Enter an address to analyze
            </p>
          </div>
        )}

        {/* hover tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 rounded px-3 py-2 text-xs"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth || 300) - 180),
              top: tooltip.y + 12,
              background: 'rgba(10, 10, 30, 0.95)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              color: COLORS.text,
              backdropFilter: 'blur(6px)',
              maxWidth: 200,
            }}
          >
            <div className="font-bold mb-1" style={{ color: COLORS.ridge }}>
              Segment #{tooltip.idx + 1}
            </div>
            <div>Pitch: {tooltip.seg.pitch_ratio} ({tooltip.seg.pitch_degrees}°)</div>
            <div>Direction: {tooltip.seg.direction || '--'} ({tooltip.seg.azimuth_degrees}°)</div>
            <div>Area: {fmtNumber(tooltip.seg.area_sqft)} ft²</div>
          </div>
        )}
      </div>

      {/* legend */}
      {geometry && (
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs"
          style={{ background: '#0d0d22', color: COLORS.dimText }}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: COLORS.ridge, boxShadow: `0 0 4px ${COLORS.ridge}` }} />
            Ridge
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: COLORS.valley, boxShadow: `0 0 4px ${COLORS.valley}` }} />
            Valley
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: COLORS.eave, boxShadow: `0 0 4px ${COLORS.eave}` }} />
            Eave
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.obstacle, boxShadow: `0 0 4px ${COLORS.obstacle}` }} />
            Obstacle
          </span>
        </div>
      )}

      {/* stats row */}
      {stats && (
        <div
          className="grid grid-cols-3 sm:grid-cols-6 gap-px text-center text-xs"
          style={{ background: '#14142a' }}
        >
          {[
            { label: 'Squares', value: stats.squares != null ? stats.squares.toFixed(1) : '--' },
            { label: 'Total ft²', value: fmtNumber(stats.sqft) },
            { label: 'Pitch', value: stats.avgPitch },
            { label: 'Segments', value: stats.segCount },
            { label: 'Obstacles', value: stats.obstCount },
            { label: 'Imagery', value: stats.imagery || '--' },
          ].map((s) => (
            <div key={s.label} className="py-2 px-1" style={{ background: '#0d0d22' }}>
              <div style={{ color: COLORS.text }} className="font-semibold">
                {s.value}
              </div>
              <div style={{ color: COLORS.dimText }} className="mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* segments detail list */}
      {geometry && (geometry.segments || []).length > 0 && (
        <div className="px-4 py-3" style={{ background: '#0a0a1a' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.dimText }}>
            SEGMENTS
          </div>
          <div className="space-y-1">
            {(geometry.segments || []).map((seg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: hoveredSeg === idx ? 'rgba(0, 255, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: hoveredSeg === idx ? '1px solid rgba(0,255,255,0.2)' : '1px solid transparent',
                  color: COLORS.text,
                }}
                onMouseEnter={() => setHoveredSeg(idx)}
                onMouseLeave={() => setHoveredSeg(null)}
              >
                <span>
                  <span style={{ color: COLORS.ridge }}>#{idx + 1}</span>{' '}
                  {seg.direction ? `${seg.direction} face` : `Segment ${idx + 1}`}
                </span>
                <span className="flex gap-4">
                  <span style={{ color: COLORS.dimText }}>{seg.pitch_ratio}</span>
                  <span>{fmtNumber(seg.area_sqft)} ft²</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
