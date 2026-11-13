/* ==========================================================
   AQUASENSE – app logic (vanilla JS, no dependencies)
   ========================================================== */
(() => {
  "use strict";

  /* ---------------- Config ---------------- */
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const YEAR = new Date().getFullYear();

  // FIREBASE CONFIGURATION
  const FIREBASE_DATABASE_URL =
    "https://aquasense-c25b0-default-rtdb.asia-southeast1.firebasedatabase.app/";

  const FIREBASE_AUTH_TOKEN = "";

  const POLL_MS = 15000;
  const STALE_MIN = 25;
  const MAX_POINTS = 144;

  let firebaseAllRows = [];

  const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64"><path d="M8 32c18-24 52-24 74 0-22 24-56 24-74 0zM82 32l30-18v36z" fill="#7bbfe8"/><circle cx="26" cy="29" r="3" fill="#0a3d62"/></svg>');

  // Safe ranges are [min, max]. Adjust to match your calibration.
  // Order here = order shown in the picker.
  const SPECIES = {
    alimango: { name: "Alimango", img: "assets/crab.png",    r: { temp: [25, 32], ph: [7.5, 8.5], do: [4, Infinity], nh3: [0, 0.5], turb: [0, 80] } },
    bangus:   { name: "Bangus",   img: "assets/bangus.png",  r: { temp: [26, 32], ph: [7.5, 8.5], do: [4, Infinity], nh3: [0, 0.5], turb: [0, 80] } },
    hipon:    { name: "Hipon",    img: "assets/shrimp.png",  r: { temp: [26, 32], ph: [7.5, 8.5], do: [4, Infinity], nh3: [0, 0.1], turb: [0, 60] } },
    hito:     { name: "Hito",     img: "assets/hito.png",    r: { temp: [26, 30], ph: [6.5, 8.5], do: [3, Infinity], nh3: [0, 1],   turb: [0, 100] } },
    tilapia:  { name: "Tilapia",  img: "assets/tilapia.png", r: { temp: [25, 32], ph: [6.5, 9],   do: [4, Infinity], nh3: [0, 0.5], turb: [0, 80] } }
  };

  const METRICS = [
    { key: "temp", label: "Temperature",       tab: "TEMPERATURE", unit: "°C",   dec: 1, amp: 1.4 },
    { key: "ph",   label: "pH Level",          tab: "pH LEVEL",    unit: "",     dec: 1, amp: 0.3 },
    { key: "nh3",  label: "Estimated Ammonia", tab: "AMMONIA",     unit: "mg/L", dec: 2, amp: 0.1 },
    { key: "do",   label: "Dissolve Oxygen",   tab: "DISSOLVE OXY",unit: "mg/L", dec: 1, amp: 0.7 },
    { key: "turb", label: "Turbidity",         tab: "TURBIDITY",   unit: "NTU",  dec: 0, amp: 10 }
  ];


  /* ---------------- Cleaning guide content ----------------
     Images: drop your files into assets/guides/ using these names
       {id}.jpg            main sensor photo
       {id}-m1.jpg …       material photos (in order)
       {id}-s1.jpg …       step photos (in order)
     .jpg, .jpeg, .png and .webp are all picked up automatically. */
  const GUIDE_DIR = "assets/guides/";
  const GUIDES = [
    {
      id: "temperature", title: "Temperature Guide",
      materials: [
        ["Microfiber cloth", "Used to gently wipe the sensor's surface."],
        ["Isopropyl alcohol", "Used sparingly to remove stubborn dirt, if compatible with the sensor."],
        ["Cotton buds", "Used to clean small and hard-to-reach areas."],
        ["Soft brush", "Used to remove loose dust and particles."]
      ],
      steps: [
        ["Step 1: Turn Off the Power", "Disconnect the temperature sensor from its power source or Arduino/microcontroller before cleaning to prevent electrical damage."],
        ["Step 2: Inspect the Sensor", "Carefully check the sensor for dust, dirt, corrosion, or other visible contaminants. Identify the areas that need cleaning."],
        ["Step 3: Remove Loose Dust", "Use a soft brush to gently remove dust and loose particles from the sensor's surface. Avoid applying too much pressure."],
        ["Step 4: Wipe the Sensor", "Use a clean, dry microfiber cloth to gently wipe the outer surface of the temperature sensor. If necessary, use a slightly damp cloth with an appropriate cleaning solution."],
        ["Step 5: Clean Small Areas", "Use a cotton bud to carefully clean small spaces and hard-to-reach areas. Avoid allowing liquid to enter the sensor's internal components."],
        ["Step 6: Allow the Sensor to Dry", "Let the sensor dry completely before reconnecting it. Make sure there is no remaining moisture on its surface or electrical connections."],
        ["Step 7: Reconnect and Test", "Reconnect the sensor to the Arduino or microcontroller. Turn on the power and check whether it provides a stable and reasonable temperature reading."]
      ]
    },
    {
      id: "oxygen", title: "Dissolve Oxygen Guide",
      materials: [
        ["Distilled water", "Used to rinse the probe without leaving mineral deposits."],
        ["Soft brush", "Used to loosen algae and slime from the probe body."],
        ["Lint-free cloth", "Used to gently blot the probe dry."],
        ["Membrane cap / filling solution", "Used to replace a damaged membrane, if your probe type needs it."]
      ],
      steps: [
        ["Step 1: Turn Off the Power", "Disconnect the probe from the power source or microcontroller before cleaning."],
        ["Step 2: Remove and Inspect", "Take the probe out of the water and check the membrane for dirt, algae, scratches, or air bubbles."],
        ["Step 3: Rinse the Probe", "Rinse the probe with distilled water to wash away loose dirt and salts."],
        ["Step 4: Clean Gently", "Use a soft brush or damp lint-free cloth on the probe body. Never touch the membrane with fingers or sharp objects."],
        ["Step 5: Check the Membrane", "If the membrane is torn or cloudy, replace the cap and refill the solution following the manufacturer's instructions."],
        ["Step 6: Dry and Recalibrate", "Blot the body dry and recalibrate the probe (for example, in air-saturated water) so readings stay accurate."],
        ["Step 7: Reconnect and Test", "Reconnect the probe, turn on the power, and confirm the dissolved oxygen reading is stable."]
      ]
    },
    {
      id: "turbidity", title: "Turbidity",
      materials: [
        ["Soft cloth", "Used to wipe the sensor housing without scratching it."],
        ["Cotton buds", "Used to clean inside the light gap and corners."],
        ["Mild soapy water", "Used to dissolve oily film and algae on the optical surfaces."],
        ["Distilled water", "Used for the final rinse so no residue is left behind."]
      ],
      steps: [
        ["Step 1: Turn Off the Power", "Disconnect the turbidity sensor from its power source or microcontroller."],
        ["Step 2: Remove the Sensor", "Take the sensor out of the water and check the light gap for mud, algae, or trapped bubbles."],
        ["Step 3: Rinse Off Debris", "Rinse with clean water to remove loose mud and particles."],
        ["Step 4: Clean the Light Gap", "Dip a cotton bud in mild soapy water and gently clean both sides of the gap. Avoid scratching the surfaces."],
        ["Step 5: Wipe the Housing", "Use a soft cloth to wipe the housing and cable. Keep the electronics board dry."],
        ["Step 6: Final Rinse and Dry", "Rinse with distilled water and let the sensor dry completely."],
        ["Step 7: Reconnect and Test", "Reconnect the sensor and test it in clean water. The reading should be very low and steady."]
      ]
    },
    {
      id: "ph", title: "pH Sensor",
      materials: [
        ["Distilled water", "Used to rinse the electrode. Never use tap water for the final rinse."],
        ["Soft tissue", "Used to blot the electrode dry. Do not rub the glass bulb."],
        ["Buffer solutions", "pH 4.01, 7.00, and 10.01 solutions used for calibration."],
        ["Storage solution", "Used to keep the glass bulb moist when the sensor is not in use."]
      ],
      steps: [
        ["Step 1: Turn Off the Power", "Disconnect the pH sensor from its power source or microcontroller."],
        ["Step 2: Remove and Inspect", "Take the electrode out of the water and check the glass bulb for algae, scale, or cracks."],
        ["Step 3: Rinse the Electrode", "Rinse gently with distilled water to remove loose dirt."],
        ["Step 4: Remove Deposits", "For stubborn film, soak the tip briefly in a mild cleaning solution recommended by the manufacturer, then rinse again."],
        ["Step 5: Blot Dry", "Gently blot with a soft tissue. Never rub the glass bulb."],
        ["Step 6: Calibrate", "Calibrate with pH 7.00 first, then pH 4.01 or 10.01 buffer, rinsing with distilled water between solutions."],
        ["Step 7: Reconnect and Test", "Reconnect the sensor and confirm the reading is stable. Keep the tip in storage solution when not in use."]
      ]
    }
  ];

  /* ---------------- State ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("aqs:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("aqs:" + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  const savedSel = store.get("selected", ["bangus"]);
  const state = {
    view: "dashboard",
    selected: (Array.isArray(savedSel) ? savedSel : []).filter(k => SPECIES[k]),
    metric: "temp",
    values: { temp: null, ph: null, nh3: null, do: null, turb: null },
    series: {},
    labels: [],
    rows: [],
    link: "wait",
    month: new Date().getMonth()
  };
  if (!state.selected.length) state.selected = ["bangus"];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (v, d) => Number(v).toFixed(d);
  const metric = k => METRICS.find(m => m.key === k);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const speciesNames = (sep = " + ") => state.selected.map(k => SPECIES[k].name).join(sep);

  /* ---------------- Utils ---------------- */
  const pad2 = n => String(n).padStart(2, "0");
  const hhmm = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const rowTime = r => new Date(`${r.date}T${r.time}`);
  const ym = () => `${YEAR}-${pad2(state.month + 1)}`;
  // Ammonia is not measured by the prototype yet, so it is fixed at 0 for now.
  const fromRow = r => ({ temp: r.temp, ph: r.ph, nh3: 0, do: r.do, turb: r.ntu });

  /* With several species in one pond the safe range is the overlap of
     every selected species' range (the strictest limits win). */
  function rangeOf(key) {
    let lo = -Infinity, hi = Infinity;
    state.selected.forEach(s => {
      const [a, b] = SPECIES[s].r[key];
      lo = Math.max(lo, a); hi = Math.min(hi, b);
    });
    return [lo, hi];
  }

  function statusOf(key, v) {
    if (v == null) return "nodata";
    const [lo, hi] = rangeOf(key);
    if (lo > hi) return "warning";
    const rounded = Number(fmt(v, metric(key).dec));
    return rounded >= lo && rounded <= hi ? "safe" : "warning";
  }

  function rangeText(key) {
    const [lo, hi] = rangeOf(key), m = metric(key);
    if (lo > hi) return "No common safe range for the selected species";
    if (hi === Infinity) return `Safe range: ≥ ${lo} ${m.unit}`.trim();
    if (lo <= 0) return `Safe range: ≤ ${hi} ${m.unit}`.trim();
    return `Safe range: ${lo} – ${hi} ${m.unit}`.trim();
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function imgEl(img, src) {
    img.onerror = () => { img.onerror = null; img.src = FALLBACK_IMG; };
    img.src = src;
  }

  /* ---------------- Drawer ---------------- */
  const wide = () => matchMedia("(min-width: 960px)").matches;
  function setMenu(open) {
    if (wide()) open = false;
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("lock", open);
    $("#menuBtn").setAttribute("aria-expanded", String(open));
  }

  /* ---------------- Dashboard ---------------- */
  function buildSensors() {
    const grid = $("#sensorGrid");
    // DOM order: temp, ph, nh3 (tall card on mobile), do, turb
    const order = ["temp", "ph", "nh3", "do", "turb"].map(metric);
    grid.innerHTML = order.map((m, i) => `
      <article class="sensor" data-key="${m.key}" style="animation-delay:${0.18 + i * 0.06}s" tabindex="0" role="button" aria-label="Show ${m.label} trend">
        <div class="s-main">
          <span class="s-label">${m.label}:</span>
          <div class="s-value"><span data-v></span><small>${m.unit}</small></div>
        </div>
        <div class="s-stat">
          <span class="s-label">Status:</span>
          <span class="pill" data-p></span>
        </div>
      </article>`).join("");
    $$(".sensor", grid).forEach(el => {
      const go = () => { state.metric = el.dataset.key; renderTabs(); updateSensors(false); drawChart(true); $(".chart-card").scrollIntoView({ behavior: "smooth", block: "nearest" }); };
      el.addEventListener("click", go);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }

  function updateSensors(flash) {
    const warnings = [];
    let hasData = false;
    METRICS.forEach(m => {
      const el = $(`.sensor[data-key="${m.key}"]`);
      const v = state.values[m.key], st = statusOf(m.key, v);
      const vEl = $("[data-v]", el), pEl = $("[data-p]", el);
      const txt = v == null ? "—" : fmt(v, m.dec);
      if (vEl.textContent !== txt) {
        vEl.textContent = txt;
        if (flash) { vEl.classList.remove("flash"); void vEl.offsetWidth; vEl.classList.add("flash"); }
      }
      pEl.textContent = st === "nodata" ? "NO DATA" : st.toUpperCase();
      pEl.className = "pill " + st;
      el.classList.toggle("sel", state.metric === m.key);
      if (v != null) hasData = true;
      if (st === "warning") warnings.push(m.key);
    });
    $("#legendText").textContent = rangeText(state.metric);
    updateRisk(warnings, hasData);
  }

  function updateRisk(warnings, hasData) {
    const card = $("#riskCard"), bad = warnings.length > 0;
    card.dataset.state = !hasData ? "nodata" : bad ? "warning" : "safe";
    $("#riskBadge").textContent = !hasData ? "NO DATA" : bad ? "WARNING" : "SAFE";
    $("#riskText").textContent = !hasData ? "WAITING FOR THE PROTOTYPE" : bad ? "CHECK AND ADJUST IMMEDIATELY" : "ALL PARAMETERS NORMAL";
    card.setAttribute("aria-label", !hasData ? "No readings yet"
      : bad ? `Warning: ${warnings.map(k => metric(k).label).join(", ")} outside the safe range`
      : "All parameters are within the safe range");
    renderPrescription(warnings, hasData);
  }

  function renderPrescription(warnings, hasData) {
    const ul = $("#rxList");
    if (!hasData) {
      if (ul.dataset.sig === "nodata") return;
      ul.dataset.sig = "nodata";
      ul.innerHTML = `<li class="ok">NO READINGS YET. CHECK THAT THE PROTOTYPE IS ON AND IN RANGE OF THE AQUASENSE WIFI.</li>`;
      return;
    }
    const set = new Set();
    warnings.forEach(k => {
      const v = state.values[k], [lo] = rangeOf(k);
      if (k === "temp") set.add(v < lo ? "CHECK COLD WATER SOURCES." : "PROVIDE SHADE AND ADD FRESH WATER.");
      if (k === "ph") set.add(v < lo ? "APPLY AGRICULTURAL LIME." : "PARTIAL WATER EXCHANGE.");
      if (k === "do") set.add("TURN ON AERATION.");
      if (k === "nh3") { set.add("PARTIAL WATER EXCHANGE."); set.add("REMOVE WASTE MATERIALS."); }
      if (k === "turb") { set.add("STOP FERTILIZING."); set.add("REMOVE WASTE MATERIALS."); }
    });
    if (warnings.length) set.add("SLIGHTLY REDUCE FEEDING.");
    const order = ["TURN ON AERATION.", "CHECK COLD WATER SOURCES.", "SLIGHTLY REDUCE FEEDING.", "STOP FERTILIZING.", "REMOVE WASTE MATERIALS."];
    const items = [...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const sig = items.join("|");
    if (ul.dataset.sig === sig) return;
    ul.dataset.sig = sig;
    ul.innerHTML = items.length
      ? items.map((t, i) => `<li style="animation-delay:${i * 0.05}s">${t}</li>`).join("")
      : `<li class="ok">NO ACTION NEEDED. KEEP MONITORING.</li>`;
  }

  function renderSpecies() {
    const keys = state.selected;
    $("#speciesName").textContent = speciesNames(", ");
    const box = $("#spImgs");
    box.dataset.n = String(Math.min(keys.length, 5));
    box.innerHTML = "";
    keys.forEach(k => {
      const img = document.createElement("img");
      img.alt = SPECIES[k].name;
      imgEl(img, SPECIES[k].img);
      box.appendChild(img);
    });
    $("#speciesCard").setAttribute("aria-label", "Cultured species: " + speciesNames(", ") + ". Tap to change.");
  }

  /* ---------------- Series & Chart ---------------- */
  function initSeries() {
    METRICS.forEach(m => { state.series[m.key] = []; });
    state.labels = [];
  }

  function renderTabs() {
    const box = $("#chartTabs");
    box.innerHTML = METRICS.map(m => `<button class="tab${m.key === state.metric ? " active" : ""}" data-key="${m.key}" role="tab" aria-selected="${m.key === state.metric}">${m.tab}</button>`).join("");
    $$(".tab", box).forEach(b => b.addEventListener("click", () => {
      state.metric = b.dataset.key; renderTabs(); updateSensors(false); drawChart(true);
    }));
  }

  const chart = { canvas: null, ctx: null, hover: -1, raf: 0, pts: [] };

  function drawChart(animate) {
    cancelAnimationFrame(chart.raf);
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) { render(1); return; }
    const t0 = performance.now(), dur = 800;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      render(1 - Math.pow(1 - p, 3));
      if (p < 1) chart.raf = requestAnimationFrame(step);
    };
    chart.raf = requestAnimationFrame(step);
  }

  function render(progress) {
    const c = chart.canvas, dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = chart.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const m = metric(state.metric), data = state.series[m.key];
    if (data.length < 2) {   // nothing real to draw yet
      ctx.fillStyle = "#6a8497"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `600 13px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText(data.length ? "Waiting for more readings…" : "No readings yet", w / 2, h / 2);
      chart.pts = []; $("#chartTip").hidden = true;
      return;
    }
    const [rlo, rhi] = rangeOf(m.key), hasBand = rlo <= rhi;
    const narrow = w < 420;
    const pad = { l: narrow ? 38 : 48, r: 14, t: 14, b: 28 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

    let lo = Math.min(...data, isFinite(rlo) && hasBand ? rlo : Infinity);
    let hi = Math.max(...data, isFinite(rhi) && hasBand ? rhi : -Infinity);
    const span = (hi - lo) || 1;
    lo -= span * 0.15; hi += span * 0.15;
    if (m.key === "ph") { lo = Math.max(0, lo); hi = Math.min(14, hi); }
    lo = Math.max(0, lo);
    const X = i => pad.l + (i / (data.length - 1)) * pw;
    const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * ph;

    ctx.font = `600 ${narrow ? 10 : 11}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textBaseline = "middle";

    // safe band
    if (hasBand) {
      const bTop = Y(Math.min(isFinite(rhi) ? rhi : hi, hi)), bBot = Y(Math.max(isFinite(rlo) ? rlo : lo, lo));
      ctx.fillStyle = "rgba(31,157,85,.10)";
      ctx.fillRect(pad.l, bTop, pw, bBot - bTop);
      ctx.strokeStyle = "rgba(31,157,85,.45)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      [[bTop, rhi], [bBot, rlo]].forEach(([y, v], i) => {
        if (!isFinite(v) || (i === 1 && v <= 0)) return;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // grid + y labels
    ctx.strokeStyle = "#e3edf4"; ctx.fillStyle = "#6a8497"; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = lo + (hi - lo) * (i / 4), y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.fillText(fmt(v, m.dec === 0 ? 0 : (hi - lo < 2 ? 2 : 1)), pad.l - 6, y);
    }

    // x labels
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const want = narrow ? 4 : 7, step = Math.max(1, Math.ceil((data.length - 1) / (want - 1)));
    state.labels.forEach((d, i) => {
      if ((data.length - 1 - i) % step !== 0) return;
      const s = hhmm(d);
      const x = Math.min(Math.max(X(i), pad.l + 14), w - pad.r - 14);
      ctx.fillText(s, x, h - pad.b + 8);
    });

    // line (clipped for animation)
    chart.pts = data.map((v, i) => ({ x: X(i), y: Y(v), v }));
    ctx.save();
    ctx.beginPath(); ctx.rect(pad.l - 2, 0, pw * progress + 4, h); ctx.clip();

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
    grad.addColorStop(0, "rgba(42,134,196,.28)"); grad.addColorStop(1, "rgba(42,134,196,0)");
    ctx.beginPath();
    chart.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineTo(X(data.length - 1), pad.t + ph); ctx.lineTo(X(0), pad.t + ph); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    chart.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.strokeStyle = "#0b5e9b"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    ctx.restore();

    // last point
    if (progress > 0.98) {
      const p = chart.pts[chart.pts.length - 1];
      const bad = statusOf(m.key, p.v) === "warning";
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = bad ? "#d6361f" : "#1f9d55"; ctx.stroke();
    }

    // hover
    const tip = $("#chartTip");
    if (chart.hover >= 0 && progress > 0.98) {
      const p = chart.pts[chart.hover];
      ctx.strokeStyle = "rgba(10,61,98,.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, pad.t); ctx.lineTo(p.x, pad.t + ph); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, 7); ctx.fillStyle = "#0b5e9b"; ctx.fill();
      const d = state.labels[chart.hover];
      tip.hidden = false;
      tip.textContent = `${hhmm(d)} · ${fmt(p.v, m.dec)} ${m.unit}`.trim();
      const tw = tip.offsetWidth / 2;
      tip.style.left = Math.min(Math.max(p.x, tw + 4), w - tw - 4) + "px";
      tip.style.top = p.y + "px";
    } else tip.hidden = true;
  }

  function setupChart() {
    chart.canvas = $("#chart");
    chart.ctx = chart.canvas.getContext("2d");
    new ResizeObserver(() => { if (state.view === "dashboard") render(1); }).observe(chart.canvas.parentElement);
    const move = e => {
      const r = chart.canvas.getBoundingClientRect(), x = e.clientX - r.left;
      let best = -1, d = Infinity;
      chart.pts.forEach((p, i) => { const dx = Math.abs(p.x - x); if (dx < d) { d = dx; best = i; } });
      chart.hover = best; render(1);
    };
    chart.canvas.addEventListener("pointermove", move);
    chart.canvas.addEventListener("pointerdown", move);
    chart.canvas.addEventListener("pointerleave", () => { chart.hover = -1; render(1); });
  }

/* ---------------- Live data from Firebase ---------------- */

function ago(min) {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.floor(min / 60)} h ago`;
  return `${Math.floor(min / 1440)} d ago`;
}

function renderLiveBar() {
  const last = state.rows[state.rows.length - 1];

  let st, msg, title = "Prototype";

  if (state.link === "down") {
    st = "down";
    msg = "Can't connect to Firebase. Check your internet connection and try again.";
  } else if (!last) {
    st = "wait";
    msg = "Connected to Firebase. Waiting for the first reading from the prototype…";
  } else {
    const t = rowTime(last);
    const min = Math.max(
      0,
      Math.round((Date.now() - t) / 60000)
    );

    if (min <= STALE_MIN) {
      st = "ok";
      msg = `Prototype online · last reading ${hhmm(t)} (${ago(min)})`;
      title = "Prototype online";
    } else {
      st = "stale";
      msg = `Prototype offline? Last reading ${MONTHS[t.getMonth()].slice(0, 3)} ${t.getDate()}, ${hhmm(t)} (${ago(min)})`;
      title = "Prototype offline?";
    }
  }

  $("#liveBar").dataset.state = st;
  $("#liveText").textContent = msg;
  $(".side-foot").dataset.state = st;
  $("#syncTitle").textContent = title;

  $("#syncLabel").textContent =
    last && st !== "down"
      ? `Last reading ${hhmm(rowTime(last))}`
      : st === "down"
        ? "No connection"
        : "Waiting for data";
}

function applyRows(rows) {
  const first = state.lastKey === undefined;

  const key = rows.length
    ? rows[rows.length - 1].key
    : "";

  const changed =
    first ||
    key !== state.lastKey ||
    rows.length !== state.rows.length;

  state.lastKey = key;
  state.rows = rows;

  METRICS.forEach(m => {
    state.series[m.key] = [];
  });

  state.labels = [];

  rows.forEach(r => {
    const v = fromRow(r);

    METRICS.forEach(m => {
      state.series[m.key].push(v[m.key]);
    });

    state.labels.push(rowTime(r));
  });

  state.values = rows.length
    ? fromRow(rows[rows.length - 1])
    : {
        temp: null,
        ph: null,
        nh3: null,
        do: null,
        turb: null
      };

  updateSensors(!first && changed);

  if (changed && state.view === "dashboard") {
    drawChart(true);
  }
}

async function loadLive() {
  try {
    let url = `${FIREBASE_DATABASE_URL}/readings.json`;

    if (FIREBASE_AUTH_TOKEN) {
      url += `?auth=${encodeURIComponent(FIREBASE_AUTH_TOKEN)}`;
    }

    const res = await fetch(url, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Firebase HTTP ${res.status}`);
    }

    const data = await res.json();

    firebaseAllRows = data
      ? Object.entries(data)
          .map(([key, reading]) => ({
            ...reading,
            key
          }))
          .filter(r =>
            r.date &&
            r.time &&
            Number.isFinite(Number(r.temp)) &&
            Number.isFinite(Number(r.ph)) &&
            Number.isFinite(Number(r.ntu)) &&
            Number.isFinite(Number(r.do))
          )
          .sort((a, b) =>
            a.key.localeCompare(b.key)
          )
      : [];

    state.link = "ok";

    // Display only the latest 144 readings on the dashboard.
    applyRows(firebaseAllRows.slice(-MAX_POINTS));

  } catch (error) {
    console.error("Firebase connection error:", error);

    state.link = "down";

    if (state.lastKey === undefined) {
      applyRows([]);
    }
  }

  renderLiveBar();
}

/* ---------------- Records from Firebase ---------------- */

function renderMonths() {
  const ul = $("#monthList");

  ul.innerHTML = MONTHS.map((m, i) => `
    <li role="option">
      <button class="${i === state.month ? "active" : ""}" data-m="${i}">
        ${m}
      </button>
    </li>
  `).join("");

  $$("button", ul).forEach(b => {
    b.addEventListener("click", () => {
      state.month = +b.dataset.m;
      toggleMonths(false);
      renderRecords();
    });
  });
}

function toggleMonths(open) {
  const ul = $("#monthList");
  const btn = $("#monthBtn");

  const show = open ?? ul.hidden;

  ul.hidden = !show;
  btn.setAttribute("aria-expanded", show);

  if (show) {
    renderMonths();

    const a = $(".active", ul);

    if (a) {
      a.scrollIntoView({ block: "center" });
    }
  }
}

async function loadFirebaseRecords() {
  let url = `${FIREBASE_DATABASE_URL}/readings.json`;

  if (FIREBASE_AUTH_TOKEN) {
    url += `?auth=${encodeURIComponent(FIREBASE_AUTH_TOKEN)}`;
  }

  const res = await fetch(url, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Firebase HTTP ${res.status}`);
  }

  const data = await res.json();

  firebaseAllRows = data
    ? Object.entries(data)
        .map(([key, reading]) => ({
          ...reading,
          key
        }))
        .filter(r =>
          r.date &&
          r.time &&
          Number.isFinite(Number(r.temp)) &&
          Number.isFinite(Number(r.ph)) &&
          Number.isFinite(Number(r.ntu)) &&
          Number.isFinite(Number(r.do))
        )
        .sort((a, b) =>
          a.key.localeCompare(b.key)
        )
    : [];
}

async function renderRecords() {
  $("#monthLabel").textContent = MONTHS[state.month];

  const ul = $("#recList");
  const dl = $("#dlMonth");

  const n = (renderRecords.n = (renderRecords.n || 0) + 1);

  const note = message => {
    ul.innerHTML = `
      <li class="empty" style="display:block">
        ${message}
      </li>
    `;

    dl.hidden = true;
  };

  try {
    await loadFirebaseRecords();

    if (n !== renderRecords.n) return;

    const selectedMonth = ym();

    const monthRows = firebaseAllRows.filter(r =>
      r.date && r.date.startsWith(selectedMonth)
    );

    if (!monthRows.length) {
      return note(`No records for ${MONTHS[state.month]} yet.`);
    }

    const grouped = {};

    monthRows.forEach(r => {
      grouped[r.date] = (grouped[r.date] || 0) + 1;
    });

    const days = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, count]) => ({
        date,
        count
      }));

    dl.hidden = false;

    ul.innerHTML = days.map(({ date, count }, i) => {
      const [y, m, d] = date.split("-");

      return `
        <li style="animation-delay:${Math.min(i, 12) * 0.03}s">
          <span class="rec-date">
            ${m} / ${d} / ${y.slice(2)}
            <span class="rec-meta">
              ${count} reading${count === 1 ? "" : "s"}
            </span>
          </span>

          <button class="btn btn-primary" data-date="${date}">
            <svg class="ico"><use href="#i-down"/></svg>
            DOWNLOAD
          </button>
        </li>
      `;
    }).join("");

    $$("button[data-date]", ul).forEach(b => {
      b.addEventListener("click", () => {
        const date = b.dataset.date;

        const rows = firebaseAllRows.filter(
          r => r.date === date
        );

        downloadCSV(
          rows,
          `aquasense_${date}.csv`
        );
      });
    });

  } catch (error) {
    console.error("Firebase records error:", error);

    if (n === renderRecords.n) {
      note("Can't retrieve records from Firebase. Please try again.");
    }
  }
}

// DOWNLOAD CSV FROM FIREBASE DATA
function downloadCSV(rows, name) {
  if (!rows.length) {
    toast("No readings to download");
    return;
  }

  const head = [
    "Date",
    "Time",
    "Species",
    ...METRICS.map(m =>
      `${m.label}${m.unit ? " (" + m.unit + ")" : ""}`
    ),
    "Status"
  ];

  const sp = speciesNames(" / ");

  const lines = rows.map(r => {
    const v = fromRow(r);

    const bad = METRICS.some(m =>
      statusOf(m.key, v[m.key]) === "warning"
    );

    return [
      r.date,
      r.time,
      sp,
      ...METRICS.map(m => fmt(v[m.key], m.dec)),
      bad ? "WARNING" : "SAFE"
    ];
  });

  const csv =
    "\ufeff" +
    [head, ...lines]
      .map(r => r.join(","))
      .join("\n");

  const a = document.createElement("a");

  a.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv" })
  );

  a.download = name;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);

  toast("Downloaded " + name);
}

  /* ---------------- Cleaning guide ---------------- */
  const EXTS = ["jpg", "png", "webp", "jpeg"];

  /* Image slot: tries .jpg/.png/.webp/.jpeg, then shows an "Add image" placeholder. */
  function slotHTML(base, alt) {
    return `<div class="slot" data-base="${base}"><img alt="${alt}" data-try="0" src="${base}.${EXTS[0]}"></div>`;
  }
  function wireSlots(root) {
    $$(".slot", root).forEach(slot => {
      const img = $("img", slot);
      const fail = () => {
        const i = +img.dataset.try + 1;
        if (i < EXTS.length) { img.dataset.try = i; img.src = `${slot.dataset.base}.${EXTS[i]}`; return; }
        img.remove();
        slot.classList.add("empty");
        slot.insertAdjacentHTML("beforeend", `<div class="slot-hint"><b>ADD IMAGE</b>${slot.dataset.base}.jpg</div>`);
      };
      img.addEventListener("error", fail);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) fail();
    });
  }

  function renderGuides() {
    const grid = $("#guideGrid");
    grid.innerHTML = GUIDES.map((g, i) => `
      <article class="g-card" style="animation-delay:${i * 0.06}s">
        <h3 class="g-title">${g.title}</h3>
        ${slotHTML(GUIDE_DIR + g.id, g.title)}
        <button class="g-btn" data-g="${g.id}" data-t="materials">MATERIALS<svg class="ico"><use href="#i-chev"/></svg></button>
        <button class="g-btn" data-g="${g.id}" data-t="procedure">PROCEDURE<svg class="ico"><use href="#i-chev"/></svg></button>
      </article>`).join("");
    wireSlots(grid);
    $$(".g-btn", grid).forEach(b => b.addEventListener("click", () => openGuide(b.dataset.g, b.dataset.t)));
  }

  function openGuide(id, type) {
    const g = GUIDES.find(x => x.id === id);
    const body = $("#gmBody");
    if (type === "materials") {
      $("#gmTitle").textContent = "MATERIALS NEEDED";
      body.innerHTML = g.materials.map(([name, text], i) => `
        <div class="gm-item"><h4>${name}</h4>${slotHTML(`${GUIDE_DIR}${id}-m${i + 1}`, name)}<p>${text}</p></div>`).join("");
    } else {
      $("#gmTitle").textContent = "STEP BY STEP";
      body.innerHTML = `<div class="gm-steps">` + g.steps.map(([name, text], i) => `
        <div class="gm-item"><h4>${name}</h4>${slotHTML(`${GUIDE_DIR}${id}-s${i + 1}`, name)}<p>${text}</p></div>`).join("") + `</div>`;
    }
    wireSlots(body);
    $(".gm-panel").scrollTop = 0;
    openModal("#guideModal");
  }

  /* ---------------- Species picker (multi-select) ---------------- */
  function renderSpeciesList() {
    const ul = $("#speciesList");
    ul.innerHTML = Object.entries(SPECIES).map(([k, s]) => `
      <li><label class="sp-row">
        <input type="checkbox" value="${k}" ${state.selected.includes(k) ? "checked" : ""}>
        <span class="sp-dot"></span>
        <span class="sp-label">${s.name}</span>
        <img alt="">
      </label></li>`).join("");
    $$(".sp-row", ul).forEach(row => {
      imgEl($("img", row), SPECIES[$("input", row).value].img);
      $("input", row).addEventListener("change", e => toggleSpecies(e.target));
    });
  }

  function toggleSpecies(input) {
    const k = input.value;
    if (input.checked) {
      if (!state.selected.includes(k)) state.selected.push(k);
    } else {
      if (state.selected.length === 1) {
        input.checked = true;
        toast("Keep at least one species selected");
        return;
      }
      state.selected = state.selected.filter(x => x !== k);
    }
    // keep the picker's order
    state.selected.sort((a, b) => Object.keys(SPECIES).indexOf(a) - Object.keys(SPECIES).indexOf(b));
    store.set("selected", state.selected);
    renderSpecies(); updateSensors(false); drawChart(false);
  }

  /* ---------------- Modals ---------------- */
  function openModal(sel) {
    $(sel).hidden = false;
    document.body.classList.add("lock");
    const first = $(".sp-row input, .gm-close", $(sel));
    first && first.focus({ preventScroll: true });
  }
  function closeModals() {
    $$(".modal").forEach(m => { m.hidden = true; });
    document.body.classList.toggle("lock", document.body.classList.contains("menu-open"));
  }

  /* ---------------- Navigation ---------------- */
  function show(view) {
    state.view = view;
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "dashboard") requestAnimationFrame(() => drawChart(true));
    if (view === "records") renderRecords();
    history.replaceState(null, "", "#" + view);
  }

  /* ---------------- Init ---------------- */
  function clock() {
    $("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function init() {
    buildSensors();
    renderSpecies();
    initSeries();
    renderTabs();
    setupChart();
    updateSensors(false);
    renderRecords();
    renderGuides();
    clock(); setInterval(clock, 15000);
    loadLive(); setInterval(loadLive, POLL_MS); setInterval(renderLiveBar, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) loadLive(); });

    $$(".nav-btn").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
    $("#menuBtn").addEventListener("click", () => setMenu(true));
    $("#scrim").addEventListener("click", () => setMenu(false));
    addEventListener("resize", () => { if (wide()) setMenu(false); });

    $("#speciesCard").addEventListener("click", () => { renderSpeciesList(); openModal("#speciesModal"); });
    $$("[data-close]").forEach(el => el.addEventListener("click", closeModals));
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModals(); toggleMonths(false); setMenu(false); } });

    $("#monthBtn").addEventListener("click", e => { e.stopPropagation(); toggleMonths(); });
    document.addEventListener("click", e => { if (!e.target.closest(".month-pick")) toggleMonths(false); });
    $("#dlMonth").addEventListener("click", () => {
  const rows = firebaseAllRows.filter(
    r => r.date && r.date.startsWith(ym())
  );

  downloadCSV(
    rows,
    `aquasense_${ym()}.csv`
  );
});

    const start = location.hash.slice(1);
    if (["records", "cleaning"].includes(start)) show(start); else drawChart(true);
  }

  document.addEventListener("DOMContentLoaded", init);
})();