/* =============================================
   js/charts.js — Graphiques SVG (sans bibliothèque)
   =============================================
   Chaque fonction renvoie une chaîne SVG. La palette est un paramètre :
   - CHART_PAL_SCREEN utilise les variables CSS (suit le mode sombre) ;
   - CHART_PAL_PRINT utilise des couleurs fixes (export PDF en image).
   ============================================= */

var CHART_PAL_SCREEN = {
  primary: 'var(--primary)', text: 'var(--text-2)', muted: 'var(--text-3)',
  grid: 'var(--border)', band: 'var(--z-safe-bg)', bg: 'none',
  period: '#e75a9b', safe: '#5cb85c', caution: '#4a9bf0', danger: '#e84a4a', accent: '#f39c12'
};
var CHART_PAL_PRINT = {
  primary: '#8b2252', text: '#333333', muted: '#888888',
  grid: '#e4d8ec', band: '#e6f5dc', bg: '#ffffff',
  period: '#e75a9b', safe: '#5cb85c', caution: '#4a9bf0', danger: '#e84a4a', accent: '#f39c12'
};

function _svgOpen(w, h, pal, fixed, label) {
  var size = fixed ? ' width="' + w + '" height="' + h + '"' : ' width="100%" preserveAspectRatio="xMidYMid meet"';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' + size
    + ' class="chart-svg" role="img" aria-label="' + esc(label || '') + '" style="font-family:Arial,Helvetica,sans-serif;">'
    + (pal.bg !== 'none' ? '<rect x="0" y="0" width="' + w + '" height="' + h + '" style="fill:' + pal.bg + '"/>' : '');
}
function _txt(x, y, s, style, anchor) {
  return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" style="' + style + '">' + esc(s) + '</text>';
}
/* Largeur logique ≈ largeur réelle → le texte garde ~11px sur téléphone */
function screenChartWidth() {
  var w = (typeof window !== 'undefined' && window.innerWidth) || 600;
  if (w >= 768) w = Math.min(w - 260, 1100) * (w >= 1100 ? 0.6 : 1); /* barre latérale / 2 colonnes */
  return Math.round(Math.max(300, Math.min(620, w - 64)));
}
function _niceMax(v) {
  if (v <= 5) return 5;
  var step = v <= 10 ? 2 : v <= 20 ? 5 : v <= 50 ? 10 : 20;
  return Math.ceil(v / step) * step;
}

/* ---- Diagramme en barres ----
   items : [{label, value, color?}]
   opts  : {pal, w, h, unit, avg, band:[min,max], fixed, min, label} */
function chartBars(items, opts) {
  opts = opts || {};
  var pal = opts.pal || CHART_PAL_SCREEN;
  var W = opts.w || screenChartWidth(), H = opts.h || 220, L = 34, R = 12, T = 24, B = 34;
  var pw = W - L - R, ph = H - T - B;
  var vals = items.map(function(i) { return i.value; });
  var maxV = _niceMax(Math.max.apply(null, vals.concat([opts.band ? opts.band[1] : 0, opts.avg || 0, 1])));
  var minV = opts.min || 0;
  var y = function(v) { return T + ph - (Math.max(v, minV) - minV) / (maxV - minV) * ph; };
  var s = _svgOpen(W, H, pal, opts.fixed, opts.label);

  /* Grille + graduations */
  for (var g = 0; g <= 4; g++) {
    var gv = minV + (maxV - minV) * g / 4, gy = y(gv);
    s += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" style="stroke:' + pal.grid + ';stroke-width:1"/>';
    s += _txt(L - 6, gy + 4, Math.round(gv), 'fill:' + pal.muted + ';font-size:10px', 'end');
  }
  /* Zone "normale" */
  if (opts.band) {
    var by1 = y(opts.band[1]), by0 = y(opts.band[0]);
    s += '<rect x="' + L + '" y="' + by1 + '" width="' + pw + '" height="' + (by0 - by1) + '" style="fill:' + pal.band + ';opacity:.55"/>';
  }
  /* Barres */
  var n = items.length, slot = pw / Math.max(n, 1), bw = Math.min(38, slot * 0.62);
  items.forEach(function(it, i) {
    var cx = L + slot * i + slot / 2, top = y(it.value);
    s += '<rect class="chart-bar" x="' + (cx - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + (T + ph - top) + '" rx="4" style="fill:' + (it.color || pal.primary) + ';animation-delay:' + (i * 50) + 'ms"/>';
    s += _txt(cx, top - 4, it.value + (opts.unit || ''), 'fill:' + pal.text + ';font-size:11px;font-weight:bold');
    s += _txt(cx, H - B + 16, it.label, 'fill:' + pal.muted + ';font-size:10px');
  });
  /* Moyenne */
  if (opts.avg) {
    var ay = y(opts.avg);
    s += '<line x1="' + L + '" y1="' + ay + '" x2="' + (W - R) + '" y2="' + ay + '" style="stroke:' + pal.accent + ';stroke-width:2;stroke-dasharray:6 4"/>';
    s += _txt(W - R, 13, '- - moyenne ' + opts.avg + (opts.unit || ''), 'fill:' + pal.accent + ';font-size:10px;font-weight:bold', 'end');
  }
  return s + '</svg>';
}

/* ---- Courbe (température) ----
   points : [{date:'YYYY-MM-DD', value}]
   opts   : {pal, w, h, cover (ligne de base), marker:{date,label}, fixed, label} */
function chartLine(points, opts) {
  opts = opts || {};
  var pal = opts.pal || CHART_PAL_SCREEN;
  var W = opts.w || screenChartWidth(), H = opts.h || 220, L = 40, R = 12, T = 16, B = 30;
  var pw = W - L - R, ph = H - T - B;
  var vals = points.map(function(p) { return p.value; });
  var lo = Math.floor((Math.min.apply(null, vals) - 0.1) * 10) / 10;
  var hi = Math.ceil((Math.max.apply(null, vals) + 0.1) * 10) / 10;
  if (hi - lo < 0.6) { lo = Math.round((lo - 0.2) * 10) / 10; hi = Math.round((hi + 0.2) * 10) / 10; }
  var d0 = points[0].date, span = Math.max(1, diffDays(d0, points[points.length - 1].date));
  var x = function(d) { return L + diffDays(d0, d) / span * pw; };
  var y = function(v) { return T + ph - (v - lo) / (hi - lo) * ph; };
  var s = _svgOpen(W, H, pal, opts.fixed, opts.label);

  for (var g = 0; g <= 4; g++) {
    var gv = lo + (hi - lo) * g / 4, gy = y(gv);
    s += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" style="stroke:' + pal.grid + ';stroke-width:1"/>';
    s += _txt(L - 6, gy + 4, gv.toFixed(1), 'fill:' + pal.muted + ';font-size:10px', 'end');
  }
  if (opts.cover) {
    var cy = y(opts.cover);
    s += '<line x1="' + L + '" y1="' + cy + '" x2="' + (W - R) + '" y2="' + cy + '" style="stroke:' + pal.caution + ';stroke-width:1.5;stroke-dasharray:5 4"/>';
  }
  if (opts.marker) {
    var mx = x(opts.marker.date);
    s += '<line x1="' + mx + '" y1="' + T + '" x2="' + mx + '" y2="' + (T + ph) + '" style="stroke:' + pal.danger + ';stroke-width:2;stroke-dasharray:3 3"/>';
    s += _txt(Math.min(mx + 4, W - R), T + 10, opts.marker.label, 'fill:' + pal.danger + ';font-size:10px;font-weight:bold', mx > W - 120 ? 'end' : 'start');
  }
  var path = points.map(function(p, i) { return (i ? 'L' : 'M') + x(p.date).toFixed(1) + ' ' + y(p.value).toFixed(1); }).join(' ');
  s += '<path class="chart-line" pathLength="1" d="' + path + '" style="fill:none;stroke:' + pal.primary + ';stroke-width:2.2;stroke-linejoin:round"/>';
  points.forEach(function(p) {
    s += '<circle class="chart-dot" cx="' + x(p.date).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3" style="fill:' + pal.primary + '"/>';
  });
  /* Dates : première, milieu, dernière */
  [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].forEach(function(p, i) {
    s += _txt(x(p.date), H - 10, fmtShort(p.date), 'fill:' + pal.muted + ';font-size:10px', i === 0 ? 'start' : i === 2 ? 'end' : 'middle');
  });
  return s + '</svg>';
}

/* ---- Anneau du cycle (tableau de bord) ----
   zones : tableau de zones, une par jour du cycle ; dayIndex : 0 = J1 */
function chartCycleRing(zones, dayIndex, size) {
  size = size || 132;
  var c = size / 2, r = size / 2 - 10, n = zones.length, gap = n > 35 ? 0.6 : 1.2;
  var col = { period: CHART_PAL_SCREEN.period, safe1: CHART_PAL_SCREEN.safe, safe2: CHART_PAL_SCREEN.safe,
              caution: CHART_PAL_SCREEN.caution, danger: CHART_PAL_SCREEN.danger };
  var s = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" class="cycle-ring" aria-hidden="true">';
  var pt = function(deg, rad) { var a = (deg - 90) * Math.PI / 180; return [c + rad * Math.cos(a), c + rad * Math.sin(a)]; };
  for (var i = 0; i < n; i++) {
    var a0 = i / n * 360 + gap / 2, a1 = (i + 1) / n * 360 - gap / 2;
    var p0 = pt(a0, r), p1 = pt(a1, r);
    s += '<path d="M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + '"'
      + ' class="ring-seg" style="fill:none;stroke:' + (col[zones[i]] || '#ccc') + ';stroke-width:12;--o:' + (i < dayIndex ? '.45' : '1') + ';opacity:var(--o);animation-delay:' + (i * 18) + 'ms"/>';
  }
  if (dayIndex >= 0 && dayIndex < n) {
    var m = pt((dayIndex + 0.5) / n * 360, r);
    s += '<circle class="ring-marker" cx="' + m[0].toFixed(2) + '" cy="' + m[1].toFixed(2) + '" r="9" style="fill:var(--surface);stroke:var(--primary);stroke-width:3"/>';
  }
  return s + '</svg>';
}

/* SVG → image PNG (pour l'insérer dans le PDF) */
function svgToPngDataUrl(svg, w, h, scale) {
  scale = scale || 2;
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() {
      var cv = document.createElement('canvas');
      cv.width = w * scale; cv.height = h * scale;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', 0.9)); /* JPEG : PDF beaucoup plus léger */
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
