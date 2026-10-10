/* Miami Sea Level Rise — panel state, model/category buttons, chart, probe and playback */
const state = { model: "int", year: START, mhhw: true, surge: 0, playing: false, probe: null };

/* ---------- Model cards ---------- */
const modelsEl = document.getElementById("models");
Object.entries(MODELS).forEach(([key, m]) => {
  const b = document.createElement("button");
  b.className = "model"; b.dataset.key = key; b.style.setProperty("--c", m.color);
  b.innerHTML = `<div class="swatch"></div><div><b>${m.name}</b><span>${m.desc}</span></div>`;
  b.onclick = () => { state.model = key; update(); };
  modelsEl.appendChild(b);
});

/* ---------- Hurricane category buttons ---------- */
const catsEl = document.getElementById("cats");
SURGE.forEach((s, i) => {
  const b = document.createElement("button");
  b.className = "cat"; b.dataset.i = i; b.textContent = i ? `Cat ${s.label}` : s.label;
  if (s.color) b.style.setProperty("--c", s.color);
  b.title = i ? `Category ${s.label} hurricane: about ${s.range} of surge` : "No storm";
  b.onclick = () => { state.surge = i; update(); };
  catsEl.appendChild(b);
});

/* ---------- Chart ---------- */
const chart = document.getElementById("chart");
const CW = 324, CH = 150, PAD = { l: 30, r: 6, t: 8, b: 18 }, YMAX = 2.4;
const cx = y => PAD.l + (y - START) / (END - START) * (CW - PAD.l - PAD.r);
const cy = m => CH - PAD.b - m / YMAX * (CH - PAD.t - PAD.b);
function drawChart() {
  let s = "";
  for (let m = 0; m <= 2; m += 0.5) {
    s += `<line x1="${PAD.l}" x2="${CW - PAD.r}" y1="${cy(m)}" y2="${cy(m)}" stroke="rgba(255,255,255,.08)"/>`;
    s += `<text x="${PAD.l - 4}" y="${cy(m) + 3}" fill="#9fb1c0" font-size="9" text-anchor="end">${m}m</text>`;
  }
  [2026, 2051, 2076, 2101, 2126].forEach(y =>
    s += `<text x="${cx(y)}" y="${CH - 5}" fill="#9fb1c0" font-size="9" text-anchor="middle">${y}</text>`);
  Object.entries(MODELS).forEach(([key, m]) => {
    let d = "";
    for (let y = START; y <= END; y += 2) d += (d ? "L" : "M") + cx(y).toFixed(1) + "," + cy(rise(key, y)).toFixed(1);
    const active = key === state.model;
    s += `<path d="${d}" fill="none" stroke="${m.color}" stroke-width="${active ? 2.6 : 1.2}" opacity="${active ? 1 : 0.45}"/>`;
  });
  const r = rise(state.model, state.year);
  s += `<line x1="${cx(state.year)}" x2="${cx(state.year)}" y1="${PAD.t}" y2="${CH - PAD.b}" stroke="rgba(255,255,255,.5)" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${cx(state.year)}" cy="${cy(r)}" r="4" fill="${MODELS[state.model].color}" stroke="#0b1218" stroke-width="1.5"/>`;
  chart.innerHTML = s;
}

/* ---------- UI refs ---------- */
const yearInput = document.getElementById("year");
const playBtn = document.getElementById("play");
const probeEl = document.getElementById("probe");
let setWater = () => {};

const baseM = () => (state.mhhw ? MHHW_M : 0) + surgeM();
function waterLevel() { return rise(state.model, state.year) + baseM(); }
let setWaterStyle = () => {};

function update() {
  document.querySelectorAll(".model").forEach(b => b.classList.toggle("active", b.dataset.key === state.model));
  document.querySelectorAll(".cat").forEach(b => b.classList.toggle("active", +b.dataset.i === state.surge));
  const s = SURGE[state.surge];
  document.getElementById("surgeNote").innerHTML = state.surge
    ? `<b style="color:${s.color}">Category ${s.label}</b>: adds about ${s.ft} ft of surge (${s.range}) on top of sea level rise.`
    : "No storm. Pick a category to add peak surge on top of the projected sea level.";
  setWaterStyle(state.surge);
  yearInput.value = state.year;
  const r = rise(state.model, state.year);
  const wl = waterLevel();
  document.getElementById("sFt").textContent = (r * 3.28084).toFixed(1);
  document.getElementById("sM").textContent = r.toFixed(2);
  document.getElementById("sWl").textContent = (wl * 3.28084).toFixed(1);
  document.getElementById("badgeYear").textContent = state.year;
  document.getElementById("badgeRise").textContent =
    `+${(r * 3.28084).toFixed(1)} ft · ${MODELS[state.model].name.replace("NOAA ", "")}` +
    (state.surge ? ` · Cat ${SURGE[state.surge].label} surge` : "");
  drawChart();
  setWater(wl);
  renderProbe();
}

function renderProbe() {
  const p = state.probe;
  if (!p) return;
  const z = p.z, zft = z * 3.28084;
  const wl = waterLevel();
  const storm = state.surge ? ` with a Category ${SURGE[state.surge].label} surge` : "";
  let html = `Ground elevation ≈ <b>${zft.toFixed(1)} ft</b> (${z.toFixed(2)} m). `;
  if (z <= baseM()) {
    html += `<b style="color:var(--ih)">Floods today${storm || (state.mhhw ? " at high tide" : "")}.</b>`;
  } else {
    let yr = null;
    for (let y = START; y <= END; y++) {
      if (rise(state.model, y) + baseM() >= z) { yr = y; break; }
    }
    html += wl >= z
      ? `<b style="color:var(--ih)">Under water in ${state.year}${storm}</b>, ${((wl - z) * 3.28084).toFixed(1)} ft deep. First floods in ${yr}.`
      : yr ? `Dry in ${state.year}${storm}; water reaches it around <b>${yr}</b> under this model.`
           : `Stays above water through ${END} under this model${storm}.`;
  }
  probeEl.innerHTML = html;
}

yearInput.oninput = e => { state.year = +e.target.value; update(); };
document.getElementById("mhhw").onchange = e => { state.mhhw = e.target.checked; update(); };

let raf = null, last = 0;
function tick(t) {
  if (!state.playing) return;
  if (t - last > 90) {
    last = t;
    state.year = state.year >= END ? START : state.year + 1;
    update();
    if (state.year === END) { state.playing = false; playBtn.textContent = "▶"; return; }
  }
  raf = requestAnimationFrame(tick);
}
playBtn.onclick = () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? "❚❚" : "▶";
  if (state.playing) { if (state.year >= END) state.year = START; raf = requestAnimationFrame(tick); }
};

update();
