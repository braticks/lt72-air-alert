/* LT72 Lietuvos oro pavojaus zemelapis, integracijos dalis.
 * Lietuvos apskriciu ribos: govlt/powerbi-map-lt (WGS84).
 * Informacinis rodinys: ne oficialiu ispejimu pakaitalas.
 */
const LT72_REGIONS = [
 ["alytaus","Alytaus","Alytus",24.05,54.42],
 ["kauno","Kauno","Kaunas",23.90,54.93],
 ["klaipedos","Klaipėdos","Klaipėda",21.60,55.74],
 ["marijampoles","Marijampolės","Marijampolė",23.50,54.55],
 ["panevezio","Panevėžio","Panevėžys",24.36,55.75],
 ["siauliu","Šiaulių","Šiauliai",23.31,55.97],
 ["taurages","Tauragės","Tauragė",22.28,55.30],
 ["telsiu","Telšių","Telšiai",22.25,56.02],
 ["utenos","Utenos","Utena",25.60,55.49],
 ["vilniaus","Vilniaus","Vilnius",25.30,54.80]
];
const LT72_COLORS = {
 red:["Raudona","#e5484d"],
 yellow:["Geltona","#f4c95a"],
 yellow_after_red:["Geltona po raudonos","#f59e0b"],
 white:["Balta","#f5f7fb"],
 not_reported:["LT72 įrašo nėra","#f5f7fb"],
 unavailable:["Duomenų nėra","#8190a3"]
};
const LT72_BYKEY = Object.fromEntries(LT72_REGIONS.map(r => [r[0],r]));
const LT72_BASE = "/lt72_air_alert/";
const LT72_ESC = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);
const LT72_NORMAL = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const LT72_KEY = label => LT72_REGIONS.find(r => LT72_NORMAL(label).startsWith(LT72_NORMAL(r[1])))?.[0];

// A blank LT72 entry is shown as white on the map for readability, but is
// not treated as a published all-clear. An unreachable sensor stays grey.
function lt72VisualCode(available, record) {
 if (!available) return "unavailable";
 if (!record) return "not_reported";
 return ["red","yellow","yellow_after_red","white"].includes(record.kodas)
   ? record.kodas : "unavailable";
}

function lt72MapPaths(topo) {
 const {arcs,transform,objects}=topo;
 if (!Array.isArray(arcs) || !transform || !objects?.LT_apskritys) {
   throw Error("Neteisingi apskričių ribų duomenys");
 }
 const points = arcs.map(arc => {
   let lon = 0, lat = 0;
   return arc.map(([x,y]) => {
     lon += x; lat += y;
     return [lon * transform.scale[0] + transform.translate[0],
             lat * transform.scale[1] + transform.translate[1]];
   });
 });
 const all = points.flat();
 const minLon = Math.min(...all.map(p => p[0]));
 const maxLon = Math.max(...all.map(p => p[0]));
 const minLat = Math.min(...all.map(p => p[1]));
 const maxLat = Math.max(...all.map(p => p[1]));
 const k = Math.cos(55 * Math.PI / 180);
 const sw = (maxLon - minLon) * k, sh = maxLat - minLat;
 const scale = Math.min(700 / sw, 365 / sh);
 const offsetX = (760 - sw * scale) / 2;
 const offsetY = (430 - sh * scale) / 2;
 const project = ([lon,lat]) => [
   offsetX + (lon - minLon) * k * scale,
   offsetY + (maxLat - lat) * scale
 ];
 function ring(arcIds) {
   const merged = [];
   for (const id of arcIds) {
     const section = id < 0 ? points[~id]?.slice().reverse() : points[id];
     if (!section) throw Error("Klaidingas apskrities ribos segmentas");
     merged.push(...(merged.length ? section.slice(1) : section));
   }
   return merged;
 }
 const drawPoly = rings => rings.map(ids => {
   const path = ring(ids).map((point,index) => {
     const [x,y] = project(point);
     return (index ? "L" : "M") + x.toFixed(2) + "," + y.toFixed(2);
   }).join(" ");
   return path + "Z";
 }).join(" ");
 return objects.LT_apskritys.geometries.map(g => {
   const key = LT72_KEY(g.properties?.APS_PAV);
   const region = LT72_BYKEY[key];
   if (!region) throw Error("Nežinoma apskritis: " + g.properties?.APS_PAV);
   const polygonList = g.type === "MultiPolygon" ? g.arcs : [g.arcs];
   const d = polygonList.map(drawPoly).join(" ");
   const [x,y] = project([region[3],region[4]]);
   return {key,name:region[1],short:region[2],path:d,x,y};
 });
}

class LT72AirAlertMapCard extends HTMLElement {
 constructor() {
   super();
   this.attachShadow({mode:"open"});
   this._config = {type:"custom:lt72-air-alert-map"};
   this._hass = null;
   this._shapes = null;
   this._selected = null;
   this._loading = false;
   this._error = null;
 }
 static getStubConfig() { return {type:"custom:lt72-air-alert-map"}; }
 setConfig(config) {
   if (!config || config.type !== "custom:lt72-air-alert-map") throw Error("Neteisingas kortos tipas");
   this._config = config;
   if (LT72_BYKEY[config.region]) this._selected = config.region;
   this._render();
 }
 set hass(value) { this._hass = value; this._render(); }
 getCardSize() { return 6; }
 getGridOptions() { return {columns:12,min_rows:4,max_rows:9}; }
 connectedCallback() {
   if (!this._shapes && !this._loading) this._loadShapes();
   else this._render();
 }
 async _loadShapes() {
   this._loading = true;
   this._render();
   try {
     const response = await fetch(LT72_BASE + "counties.json", {cache:"force-cache"});
     if (!response.ok) throw Error("HTTP " + response.status);
     this._shapes = lt72MapPaths(await response.json());
     this._error = null;
   } catch(err) {
     this._error = "Žemėlapio ribų nepavyko įkelti: " + err.message;
   } finally {
     this._loading = false;
     this._render();
   }
 }
 _sensor() {
   if (!this._hass) return null;
   if (this._config.entity) return this._hass.states[this._config.entity] || null;
   return Object.values(this._hass.states).find(s =>
     s.entity_id.startsWith("sensor.") &&
     s.attributes?.saltinis === "LT72" &&
     typeof s.attributes.apskritys === "object") || null;
 }
 _render() {
   const root = this.shadowRoot;
   if (!root) return;
   const sensor = this._sensor();
   const available = sensor && sensor.state !== "unknown" && sensor.state !== "unavailable";
   const published = available ? sensor.attributes.apskritys || {} : {};
   if (!this._selected) this._selected = LT72_KEY(sensor?.attributes?.apskritis) || "kauno";
   const selected = LT72_BYKEY[this._selected] || LT72_BYKEY.kauno;
   const current = published[selected[0]];
   const code = lt72VisualCode(available, current);
   const level = LT72_COLORS[code] || LT72_COLORS.not_reported;
   let message = "";
   if (!sensor) message = "Nerastas LT72 sensorius. Pridėkite Lietuvos oro pavojaus integraciją.";
   else if (!available) message = "Šiuo metu duomenys neprieinami. Tikrinkite oficialius pranešimus.";
   else if (!current) message = "LT72 nėra paskelbto įrašo šiai apskričiai. Tai nereiškia, kad saugu.";
   else message = "Paskelbta: " + (current.paskelbta || "laikas nenurodytas");
   const countyShapes = this._shapes ? this._shapes.map(shape => {
     const e = published[shape.key];
     const status = lt72VisualCode(available, e);
     const l = LT72_COLORS[status] || LT72_COLORS.not_reported;
     const chosen = shape.key === selected[0];
     return '<g data-region="' + shape.key + '" tabindex="0" role="button" class="region' +
       (chosen ? ' selected' : '') + '" aria-label="' + LT72_ESC(shape.name + ': ' + (available ? l[0] : 'Neprieinama')) + '">' +
       '<path d="' + shape.path + '" fill="' + l[1] + '" stroke="' +
       (chosen ? '#3b82f6' : 'var(--divider-color,#526278)') +
       '" stroke-width="' + (chosen ? '3.5' : '1.5') +
       '" stroke-dasharray="' + (status === "not_reported" && !chosen ? "4 3" : "none") +
       '" stroke-linejoin="round"></path>' +
       '<text x="' + shape.x.toFixed(1) + '" y="' + shape.y.toFixed(1) +
       '" text-anchor="middle" dominant-baseline="middle" pointer-events="none">' +
       LT72_ESC(shape.short) + '</text><title>' +
       LT72_ESC(shape.name + ' apskritis: ' + l[0]) + '</title></g>';
   }).join("") : "";
   const legends = Object.entries(LT72_COLORS)
     .filter(([key]) => key !== "not_reported")
     .map(([,l]) =>
     '<span class="legend-item"><span class="sample" style="background:' + l[1] +
     '"></span>' + LT72_ESC(l[0]) + '</span>'
   ).join("");
   root.innerHTML = [
     '<style>',
     ':host{display:block;color:var(--primary-text-color);font-family:var(--primary-font-family,Roboto,Arial,sans-serif)}',
     'ha-card{display:block;padding:16px;overflow:hidden}',
     '.header{display:flex;gap:11px;align-items:center;margin-bottom:12px}',
     '.logo{width:40px;height:40px;border-radius:10px;flex-shrink:0}',
     '.titles{flex:1;min-width:0}.title{font-size:17px;font-weight:650}',
     '.sub{font-size:12px;color:var(--secondary-text-color);margin-top:3px}',
     '.source{font-size:12px;white-space:nowrap;color:var(--primary-color);text-decoration:none}',
     '.map{overflow:hidden;border-radius:12px;background:var(--secondary-background-color,#f2f4f7)}',
     '.map svg{width:100%;height:auto;max-height:420px;display:block}',
     '.region{cursor:pointer;outline:none}.region path{transition:stroke .12s,filter .12s}',
     '.region:hover path,.region:focus-visible path{stroke:#2563eb;stroke-width:3;filter:brightness(1.06)}',
     '.region text{font:600 13px Roboto,Arial,sans-serif;fill:#17263c;paint-order:stroke;stroke:#ffffffb8;stroke-width:3px;stroke-linejoin:round}',
     '.region.selected text{font-weight:800}',
     '.detail{display:flex;align-items:center;gap:12px;border:1px solid var(--divider-color);border-radius:11px;padding:12px;margin-top:12px}',
     '.dot{height:13px;width:13px;border:1px solid #94a3b8;border-radius:50%;flex-shrink:0}',
     '.region-name{font-weight:600;font-size:14px}.status{font-weight:600;font-size:13px;margin-top:3px}',
     '.desc{font-size:12px;color:var(--secondary-text-color);margin-top:4px;line-height:1.4}',
     '.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 13px;margin-top:14px}',
     '.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--secondary-text-color)}',
     '.sample{height:10px;width:10px;border:1px solid #9ca3af;border-radius:3px;display:inline-block}',
     '.foot{font-size:10px;color:var(--secondary-text-color);margin-top:11px;line-height:1.35}',
     '.loading{padding:46px 10px;text-align:center;color:var(--secondary-text-color);font-size:12px}',
     '@media(max-width:480px){ha-card{padding:12px}.title{font-size:15px}.logo{width:32px;height:32px}.region text{font-size:15px}.legend{justify-content:flex-start}}',
     '</style>',
     '<ha-card>',
     '<div class="header"><img src="' + LT72_BASE + 'icon.svg" class="logo" alt="" />',
     '<div class="titles"><div class="title">' +
       LT72_ESC(this._config.title || "Oro pavojus Lietuvoje") +
       '</div><div class="sub">LT72 • 10 apskričių • kas 60 s</div></div>',
     '<a class="source" href="https://lt72.lt/" target="_blank" rel="noopener noreferrer">LT72 ↗</a></div>',
     '<div class="map">',
     this._error ? '<div class="loading">' + LT72_ESC(this._error) + '</div>' :
       !this._shapes ? '<div class="loading">Kraunamas Lietuvos žemėlapis...</div>' :
       '<svg viewBox="0 0 760 430" role="img" aria-label="Lietuvos oro pavojaus žemėlapis">' + countyShapes + '</svg>',
     '</div>',
     '<div class="detail"><span class="dot" style="background:' + level[1] + '"></span>',
     '<div><div class="region-name">' + LT72_ESC(selected[1]) + ' apskritis</div>',
     '<div class="status">' + LT72_ESC(available ? level[0] : 'Neprieinama') + '</div>',
     '<div class="desc">' + LT72_ESC(message) + '</div></div></div>',
     '<div class="legend">' + legends + '</div>',
     '<div class="foot">Balta spalva = LT72 paskelbtas atšaukimas ARBA nėra įrašo ',
     '(punktyrinė riba). Be įrašo nereiškia oficialaus pavojaus atšaukimo. ',
     'Pilka = duomenys neprieinami. Vadovaukitės LT-Alert ir oficialiais perspėjimais.</div>',
     '</ha-card>'
   ].join("");
   root.querySelectorAll("[data-region]").forEach(node => {
     const select = () => { this._selected = node.getAttribute("data-region"); this._render(); };
     node.addEventListener("click",select);
     node.addEventListener("keydown", e => {
       if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
     });
   });
 }
}

if (!customElements.get("lt72-air-alert-map")) {
 customElements.define("lt72-air-alert-map",LT72AirAlertMapCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "lt72-air-alert-map")) {
 window.customCards.push({
   type:"lt72-air-alert-map",
   name:"LT72 – oro pavojaus žemėlapis",
   description:"Lietuvos apskričių perspėjimai žemėlapyje",
   preview:true
 });
}
