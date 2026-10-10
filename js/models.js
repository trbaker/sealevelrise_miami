/* Miami Sea Level Rise — projection models, storm surge and helper math */
/* ---------- Sea level rise models (meters above 2020, Virginia Key, Miami) ---------- */
const DECADES = [2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100, 2110, 2120, 2130];
const MODELS = {
  il:  { name: "NOAA Intermediate-Low", color: getVar("--il"),
         desc: "≈0.5 m global rise by 2100. Ocean warming with modest ice loss.",
         v: [0, 0.10, 0.17, 0.24, 0.30, 0.37, 0.43, 0.50, 0.57, 0.63, 0.69, 0.75] },
  int: { name: "NOAA Intermediate", color: getVar("--int"),
         desc: "≈1.0 m global rise by 2100. Close to the curve Miami-Dade designs around.",
         v: [0, 0.11, 0.20, 0.29, 0.40, 0.52, 0.65, 0.80, 0.96, 1.11, 1.26, 1.40] },
  ih:  { name: "NOAA Intermediate-High", color: getVar("--ih"),
         desc: "≈1.5 m global rise by 2100. Accelerating Greenland and Antarctic ice loss.",
         v: [0, 0.13, 0.26, 0.40, 0.57, 0.78, 1.02, 1.29, 1.58, 1.85, 2.10, 2.33] }
};
const START = 2026, END = 2126;
const MHHW_M = 0.33;     // approx. mean higher high water above MSL at Virginia Key
const SURFACE_EPS = 0.05; // lifts the plane just off z=0 to avoid flicker with the ocean surface

function getVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function rawRise(key, year) {
  const v = MODELS[key].v;
  if (year <= DECADES[0]) return 0;
  for (let i = 1; i < DECADES.length; i++) {
    if (year <= DECADES[i]) {
      const t = (year - DECADES[i - 1]) / 10;
      return v[i - 1] + t * (v[i] - v[i - 1]);
    }
  }
  return v[v.length - 1];
}
function rise(key, year) { return rawRise(key, year) - rawRise(key, START); }

// Representative peak storm surge (ft above normal tide) for Miami / Biscayne Bay by
// Saffir-Simpson category, using the historical surge ranges once attached to the scale
// (Cat 1: 4–5 ft, Cat 2: 6–8, Cat 3: 9–12, Cat 4: 13–18, Cat 5: 18+).
const SURGE = [
  { label: "None", ft: 0,    color: "" },
  { label: "1",    ft: 4.5,  color: "#ffe066", range: "4–5 ft" },
  { label: "2",    ft: 7,    color: "#ffb347", range: "6–8 ft" },
  { label: "3",    ft: 10.5, color: "#ff8243", range: "9–12 ft" },
  { label: "4",    ft: 15,   color: "#ff4f4f", range: "13–18 ft" },
  { label: "5",    ft: 19,   color: "#d63ad6", range: "18+ ft" }
];
const surgeM = () => SURGE[state.surge].ft * 0.3048;
