/* Miami Sea Level Rise — ArcGIS SceneView, OSM 3D buildings, water surface, gauge and navigation */
/* ---------- ArcGIS 3D scene ---------- */
require([
  "esri/Map", "esri/views/SceneView", "esri/layers/SceneLayer", "esri/layers/GraphicsLayer",
  "esri/Graphic", "esri/geometry/Polygon", "esri/geometry/Point", "esri/Camera", "esri/Viewpoint",
  "esri/widgets/Compass", "esri/widgets/Home", "esri/widgets/Zoom",
  "esri/widgets/NavigationToggle", "esri/widgets/Fullscreen"
], (Map, SceneView, SceneLayer, GraphicsLayer, Graphic, Polygon, Point, Camera, Viewpoint,
    Compass, Home, Zoom, NavigationToggle, Fullscreen) => {

  const buildings = new SceneLayer({
    portalItem: { id: "ca0470dbbddb4db28bad74ed39949e25" }, // Esri OpenStreetMap 3D Buildings
    popupEnabled: false,
    renderer: {
      type: "simple",
      symbol: {
        type: "mesh-3d",
        symbolLayers: [{
          type: "fill",
          material: { color: [236, 230, 218, 1], colorMixMode: "replace" },
          edges: { type: "solid", color: [40, 40, 40, 0.35], size: 0.6 }
        }]
      }
    }
  });

  const waterLayer = new GraphicsLayer({ elevationInfo: { mode: "absolute-height" } });
  const probeLayer = new GraphicsLayer({ elevationInfo: { mode: "relative-to-ground" } });

  const map = new Map({
    basemap: "satellite",
    ground: "world-elevation",
    layers: [waterLayer, buildings, probeLayer]
  });

  const VIEWS = {
    downtown: { position: { longitude: -80.158, latitude: 25.742, z: 850 }, heading: 318, tilt: 74 },
    beach:    { position: { longitude: -80.152, latitude: 25.756, z: 650 }, heading: 38,  tilt: 74 },
    overview: { position: { longitude: -80.12,  latitude: 25.60,  z: 9000 }, heading: 345, tilt: 55 }
  };

  const view = new SceneView({
    container: "viewDiv",
    map,
    camera: VIEWS.downtown,
    qualityProfile: "high",
    environment: {
      lighting: { type: "sun", date: new Date("2026-06-21T16:00:00Z"), directShadowsEnabled: true },
      atmosphereEnabled: true
    },
    ui: { components: ["zoom", "attribution"] }
  });
  // Scene Viewer–style 3D navigation controls (top to bottom): Home, Zoom in/out,
  // Pan/Rotate toggle, Compass, Fullscreen
  view.ui.remove("zoom");
  view.ui.add([
    new Home({ view, viewpoint: new Viewpoint({ camera: new Camera(VIEWS.downtown) }) }),
    new Zoom({ view }),
    new NavigationToggle({ view }),
    new Compass({ view }),
    new Fullscreen({ view, element: document.body })
  ], "bottom-right");

  // Water surface covering Biscayne Bay, Miami, Miami Beach and the low inland areas.
  // Built as a grid of ~1.2 km cells: a single large flat polygon would sag tens of meters
  // below the curved globe in its interior, hiding the rise. Small cells keep sag < 3 cm.
  const EXTENT = { xmin: -80.40, ymin: 25.60, xmax: -80.05, ymax: 25.95 };
  const CELL = 0.0125;
  const waterSymbol = {
    type: "polygon-3d",
    symbolLayers: [{
      type: "water",
      waveDirection: 160,
      color: [30, 110, 140],
      waveStrength: "rippled",
      waterbodySize: "large"
    }]
  };
  const waterGraphic = new Graphic({ symbol: waterSymbol });
  waterLayer.add(waterGraphic);

  // Storm water: muddier and rougher as category increases
  let lastStyle = -1;
  setWaterStyle = (cat) => {
    if (cat === lastStyle) return;
    lastStyle = cat;
    waterGraphic.symbol = {
      type: "polygon-3d",
      symbolLayers: [{
        type: "water",
        waveDirection: 160,
        color: cat ? [[96, 110, 98], [92, 100, 86], [88, 92, 76], [84, 84, 68], [80, 76, 62]][cat - 1] : [30, 110, 140],
        waveStrength: cat === 0 ? "rippled" : cat <= 2 ? "slight" : cat <= 4 ? "moderate" : "moderate",
        waterbodySize: "large"
      }]
    };
  };
  setWaterStyle(state.surge);

  setWater = (level) => {
    const z = level + SURFACE_EPS;
    const { xmin, ymin, xmax, ymax } = EXTENT;
    const rings = [];
    for (let x = xmin; x < xmax - 1e-9; x += CELL) {
      const x2 = Math.min(x + CELL, xmax);
      for (let y = ymin; y < ymax - 1e-9; y += CELL) {
        const y2 = Math.min(y + CELL, ymax);
        rings.push([[x, y, z], [x, y2, z], [x2, y2, z], [x2, y, z], [x, y, z]]);
      }
    }
    waterGraphic.geometry = new Polygon({ hasZ: true, spatialReference: { wkid: 4326 }, rings });
  };
  setWater(waterLevel());

  // Tide-gauge staff at the downtown waterfront: alternating 1-ft bands from today's mean sea level
  const GAUGE = { longitude: -80.1858, latitude: 25.7708 };
  const gaugeLayer = new GraphicsLayer({ elevationInfo: { mode: "absolute-height" } });
  map.add(gaugeLayer);
  const FT = 0.3048;
  for (let i = 0; i < 30; i++) { // 30 ft covers Cat 5 surge + high-end rise + tide
    gaugeLayer.add(new Graphic({
      geometry: new Point({ ...GAUGE, z: i * FT }),
      symbol: { type: "point-3d", symbolLayers: [{
        type: "object", resource: { primitive: "cylinder" }, anchor: "bottom",
        width: 2.2, depth: 2.2, height: FT,
        material: { color: i % 2 ? [245, 245, 245] : [215, 50, 45] }
      }] }
    }));
    if (i > 0 && (i <= 10 ? i % 2 === 0 : i % 5 === 0)) {
      gaugeLayer.add(new Graphic({
        geometry: new Point({ longitude: GAUGE.longitude + 0.000035, latitude: GAUGE.latitude, z: i * FT }),
        symbol: { type: "point-3d", symbolLayers: [{
          type: "text", text: `${i} ft`, size: 11,
          material: { color: "white" }, halo: { color: [0, 0, 0, 0.8], size: 1.2 }
        }] }
      }));
    }
  }
  VIEWS.gauge  = { position: { longitude: GAUGE.longitude - 0.0011, latitude: GAUGE.latitude - 0.0013, z: 14 }, heading: 36, tilt: 88 };
  VIEWS.street = { position: { longitude: -80.1468, latitude: 25.7835, z: 28 }, heading: 75, tilt: 84 };

  document.getElementById("showWater").onchange = e => { waterLayer.visible = e.target.checked; };
  document.querySelectorAll("[data-view]").forEach(b =>
    b.onclick = () => view.goTo(VIEWS[b.dataset.view], { duration: 2200, easing: "in-out-cubic" }));

  // Click-to-probe ground elevation
  view.on("click", async (evt) => {
    const mp = evt.mapPoint;
    if (!mp) return;
    probeEl.innerHTML = "<em>Measuring ground elevation…</em>";
    try {
      const pt = new Point({ longitude: mp.longitude, latitude: mp.latitude });
      const res = await map.ground.queryElevation(pt, { returnSampleInfo: false });
      state.probe = { z: res.geometry.z };
      probeLayer.removeAll();
      probeLayer.add(new Graphic({
        geometry: pt,
        symbol: {
          type: "point-3d",
          symbolLayers: [{ type: "icon", resource: { primitive: "circle" }, size: 12,
                           material: { color: [79, 195, 247] }, outline: { color: "white", size: 2 } }],
          verticalOffset: { screenLength: 40, maxWorldLength: 200, minWorldLength: 20 },
          callout: { type: "line", size: 1.5, color: "white" }
        }
      }));
      renderProbe();
    } catch (err) {
      probeEl.innerHTML = "<em>Couldn’t read elevation here — try another spot.</em>";
    }
  });
});
