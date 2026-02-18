// --- Constantes & helpers ---
const I0 = 1e-12;
const TWO_PI = Math.PI * 2;

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function log10(x){ return Math.log(x) / Math.LN10; }

function formatSci(x){
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 0.01 && abs < 10000) return x.toFixed(4).replace(/0+$/,"").replace(/\.$/,"");
  return x.toExponential(3).replace("e", "×10^");
}

function formatDb(x){
  if (!isFinite(x)) return "—";
  return x.toFixed(1);
}

// --- UI refs ---
const pSlider = document.getElementById("pSlider");
const rSlider = document.getElementById("rSlider");

const pValue = document.getElementById("pValue");
const rValue = document.getElementById("rValue");
const iValue = document.getElementById("iValue");
const lValue = document.getElementById("lValue");
const labelSafety = document.getElementById("labelSafety");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

let mode = "distance"; // "distance" | "power"

// --- Physique ---
function computeI(P, r){
  return P / (4 * Math.PI * r * r);
}

function computedB(I){
  if (I <= 0) return -Infinity;
  return 10 * log10(I / I0);
}

function safetyLabel(L){
  // échelles indicatives (pas médicales, juste repères)
  if (!isFinite(L)) return "Niveau non défini";
  if (L < 20) return "🔈 Très faible (calme)";
  if (L < 50) return "🔉 Faible (pièce calme)";
  if (L < 70) return "🔊 Modéré (conversation/bruit urbain léger)";
  if (L < 85) return "⚠️ Fort (prudence si long)";
  if (L < 100) return "🚨 Très fort (risque si exposition)";
  return "☠️ Extrême (danger auditif)";
}

// --- Dessin (graphique Canvas) ---
function drawAxes(x0, y0, w, h, xLabel, yLabel){
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1;

  // axe x
  ctx.beginPath(); ctx.moveTo(x0, y0+h); ctx.lineTo(x0+w, y0+h); ctx.stroke();
  // axe y
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0+h); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = "12px Arial";
  ctx.fillText(xLabel, x0 + w - ctx.measureText(xLabel).width, y0 + h + 22);

  ctx.save();
  ctx.translate(x0 - 28, y0 + 10);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawCurve(points, x0, y0, w, h, xMin, xMax, yMin, yMax){
  function X(x){ return x0 + ( (x - xMin) / (xMax - xMin) ) * w; }
  function Y(y){ return y0 + h - ( (y - yMin) / (yMax - yMin) ) * h; }

  ctx.save();
  ctx.strokeStyle = "rgba(124,240,255,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((pt, idx) => {
    const x = X(pt.x);
    const y = Y(pt.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.restore();
}

function drawMarker(x, y, x0, y0, w, h, xMin, xMax, yMin, yMax){
  function X(x){ return x0 + ( (x - xMin) / (xMax - xMin) ) * w; }
  function Y(y){ return y0 + h - ( (y - yMin) / (yMax - yMin) ) * h; }

  const cx = X(x);
  const cy = Y(y);

  ctx.save();
  ctx.fillStyle = "rgba(255,124,200,.95)";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, TWO_PI);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,124,200,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, TWO_PI);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(x0, y0, w, h){
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = x0; x <= x0 + w; x += step){
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke();
  }
  for (let y = y0; y <= y0 + h; y += step){
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawChart(P, r){
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pad = 55;
  const x0 = pad;
  const y0 = 18;
  const w = canvas.width - pad - 18;
  const h = canvas.height - 18 - pad;

  drawGrid(x0, y0, w, h);

  let points = [];
  let xMin, xMax, yMin, yMax;
  let xLabel, yLabel;

  if (mode === "distance"){
    xLabel = "Distance r (m)";
    yLabel = "Niveau L (dB)";
    xMin = 0.2; xMax = 50;

    for (let rr = xMin; rr <= xMax; rr += 0.25){
      const I = computeI(P, rr);
      const L = computedB(I);
      points.push({x: rr, y: clamp(L, -20, 140)});
    }

    // autoscale y
    const ys = points.map(p=>p.y);
    yMin = Math.min(...ys) - 5;
    yMax = Math.max(...ys) + 5;

    drawAxes(x0, y0, w, h, xLabel, yLabel);
    drawCurve(points, x0, y0, w, h, xMin, xMax, yMin, yMax);

    const currentL = clamp(computedB(computeI(P, r)), -20, 140);
    drawMarker(r, currentL, x0, y0, w, h, xMin, xMax, yMin, yMax);

  } else {
    xLabel = "Puissance P (W)";
    yLabel = "Niveau L (dB)";
    xMin = 1e-8; xMax = 1e2;

    // points en log sur P
    for (let e = -8; e <= 2; e += 0.05){
      const PP = Math.pow(10, e);
      const I = computeI(PP, r);
      const L = computedB(I);
      points.push({x: PP, y: clamp(L, -20, 140)});
    }

    const ys = points.map(p=>p.y);
    yMin = Math.min(...ys) - 5;
    yMax = Math.max(...ys) + 5;

    // axes custom (x en log)
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1;
    // x
    ctx.beginPath(); ctx.moveTo(x0, y0+h); ctx.lineTo(x0+w, y0+h); ctx.stroke();
    // y
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0+h); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "12px Arial";
    ctx.fillText(xLabel, x0 + w - ctx.measureText(xLabel).width, y0 + h + 22);

    ctx.save();
    ctx.translate(x0 - 28, y0 + 10);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // curve with log X
    function Xlog(PP){
      const a = log10(xMin), b = log10(xMax);
      return x0 + ((log10(PP) - a) / (b - a)) * w;
    }
    function Ylin(L){
      return y0 + h - ((L - yMin) / (yMax - yMin)) * h;
    }

    ctx.strokeStyle = "rgba(124,240,255,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((pt, idx)=>{
      const xx = Xlog(pt.x);
      const yy = Ylin(pt.y);
      if (idx===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
    });
    ctx.stroke();

    // marker for current P
    const currentL = clamp(computedB(computeI(P, r)), -20, 140);
    const mx = Xlog(P);
    const my = Ylin(currentL);

    ctx.fillStyle = "rgba(255,124,200,.95)";
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, TWO_PI); ctx.fill();

    ctx.strokeStyle = "rgba(255,124,200,.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx, my, 10, 0, TWO_PI); ctx.stroke();

    ctx.restore();
  }

  // petit texte d’échelle en bas
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = "12px Arial";
  ctx.fillText("Point rose = réglage actuel", x0, canvas.height - 18);
  ctx.restore();
}

// --- Update UI ---
function update(){
  // P slider est en exposant : P = 10^x
  const exp = parseFloat(pSlider.value);
  const P = Math.pow(10, exp);

  const r = parseFloat(rSlider.value);

  const I = computeI(P, r);
  const L = computedB(I);

  pValue.textContent = formatSci(P);
  rValue.textContent = r.toFixed(1);
  iValue.textContent = formatSci(I);
  lValue.textContent = formatDb(L);

  labelSafety.textContent = safetyLabel(L);

  drawChart(P, r);
}

// --- Tabs mode ---
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    update();
  });
});

// --- listeners ---
pSlider.addEventListener("input", update);
rSlider.addEventListener("input", update);

// init
update();
