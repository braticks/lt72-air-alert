const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const code = fs.readFileSync(
  path.join(root,"custom_components/lt72_air_alert/www/lt72-air-alert-map.js"), "utf8"
);
const topo = JSON.parse(fs.readFileSync(
  path.join(root,"custom_components/lt72_air_alert/www/counties.json"), "utf8"
));
const context = {
  window:{},
  HTMLElement:class {
    attachShadow() {
      this.shadowRoot = {innerHTML:"",querySelectorAll:() => []};
      return this.shadowRoot;
    }
    dispatchEvent(event) { this.lastEvent = event; return true; }
  },
  CustomEvent:class {
    constructor(type,init) { this.type=type; Object.assign(this,init); }
  },
  document:{createElement:tag => ({tagName:tag})},
  customElements:{get:()=>null,define:()=>{}},
};
vm.createContext(context);
vm.runInContext(code, context);
context.mapInput = topo;
const features = vm.runInContext("lt72MapPaths(mapInput)",context);
assert.equal(features.length,10);
assert.equal(new Set(features.map(x => x.key)).size,10);
assert(features.every(x => x.path.startsWith("M") && !x.path.includes("NaN")));
assert(features.every(x => x.x >= 0 && x.x <= 760 && x.y >= 0 && x.y <= 430));
assert(features.some(x => x.key === "kauno"));
// Missing alert is a white map region, distinct from an official all-clear.
assert.equal(vm.runInContext("lt72VisualCode(true, null)", context), "not_reported");
assert.equal(vm.runInContext("LT72_COLORS.not_reported[1]", context), "#f5f7fb");
assert.equal(vm.runInContext("LT72_COLORS.white[1]", context), "#f5f7fb");
assert.equal(vm.runInContext('lt72VisualCode(true, {kodas:"white"})', context), "white");
assert.equal(vm.runInContext('lt72VisualCode(true, {kodas:"red"})', context), "red");
assert.equal(vm.runInContext('lt72VisualCode(true, {kodas:"yellow"})', context), "yellow");
assert.equal(vm.runInContext('lt72VisualCode(false, {kodas:"white"})', context), "unavailable");
assert.equal(vm.runInContext("LT72_COLORS.unavailable[1]", context), "#8190a3");
// Visual editor contract: configurable fields, default-on flags, standard change event.
assert.equal(vm.runInContext('typeof LT72AirAlertMapCard.getConfigElement',context),"function");
assert.equal(vm.runInContext('LT72_DISPLAY_OPTIONS.length',context),11);
assert.equal(vm.runInContext('LT72_DISPLAY_OPTIONS.some(x=>x[0] === "show_county_names")',context),true);
assert.equal(vm.runInContext('LT72_DISPLAY_OPTIONS.some(x=>x[0] === "show_status_panel")',context),true);
assert.equal(vm.runInContext('LT72_DISPLAY_OPTIONS.some(x=>x[0] === "show_legend")',context),true);
assert.equal(vm.runInContext('LT72_DISPLAY_OPTIONS.some(x=>x[0] === "show_disclaimer")',context),true);
// Legacy cards have every element visible unless the user disables it.
assert.equal(vm.runInContext('LT72AirAlertMapCard.prototype._show.call({_config:{}},"show_icon")',context),true);
assert.equal(vm.runInContext('LT72AirAlertMapCard.prototype._show.call({_config:{show_icon:false}},"show_icon")',context),false);
console.log("Vizualinio redaktoriaus parinktys ir seni kortų nustatymai patikrinti.");


// Simulated HA visual editor: changing controls must emit config-changed.
const editor = vm.runInContext("new LT72AirAlertMapEditor()", context);
editor.setConfig({type:"custom:lt72-air-alert-map"});
assert(editor.shadowRoot.innerHTML.includes('data-setting="show_icon"'));
assert(editor.shadowRoot.innerHTML.includes('data-input="region"'));
assert(editor.shadowRoot.innerHTML.includes('data-input="entity"'));
editor._emit("show_icon",false);
assert.equal(editor.lastEvent.type,"config-changed");
assert.equal(editor.lastEvent.bubbles,true);
assert.equal(editor.lastEvent.composed,true);
assert.equal(editor.lastEvent.detail.config.show_icon,false);
editor._emit("show_icon",true);
assert.equal(Object.hasOwn(editor.lastEvent.detail.config,"show_icon"),false);
editor._emit("region","vilniaus");
assert.equal(editor.lastEvent.detail.config.region,"vilniaus");
editor._emit("region","");
assert.equal(Object.hasOwn(editor.lastEvent.detail.config,"region"),false);
editor._emit("compact",true);
assert.equal(editor.lastEvent.detail.config.compact,true);

// Simulated HA card: options must affect the HTML, not only the editor.
const card=vm.runInContext("new LT72AirAlertMapCard()",context);
const sampleSensor={
  entity_id:"sensor.lt72_demo", state:"Balta",
  attributes:{
    saltinis:"LT72",apskritis:"Kauno apskritis",
    apskritys:{kauno:{kodas:"white",paskelbta:"2026-10-18 17:00"}}
  }
};
card._shapes=features;
card.setConfig({type:"custom:lt72-air-alert-map",region:"kauno"});
card.hass={states:{"sensor.lt72_demo":sampleSensor}};
const originalHtml=card.shadowRoot.innerHTML;
assert(originalHtml.includes('<div class="header">'));
assert(originalHtml.includes('<div class="legend">'));
assert(originalHtml.includes('<div class="detail">'));
assert(originalHtml.includes('<div class="foot">'));
assert(originalHtml.includes('<img src='));
assert(originalHtml.includes('<text x='));
assert(originalHtml.includes("Paskelbta: 2026-10-18 17:00"));
card.setConfig({
  type:"custom:lt72-air-alert-map",region:"vilniaus",
  show_header:false,show_legend:false,show_status_panel:false,
  show_disclaimer:false,show_county_names:false,compact:true
});
const compactHtml=card.shadowRoot.innerHTML;
assert(!compactHtml.includes('<div class="header">'));
assert(!compactHtml.includes('<div class="legend">'));
assert(!compactHtml.includes('<div class="detail">'));
assert(!compactHtml.includes('<div class="foot">'));
assert(!compactHtml.includes('<text x='));
assert(compactHtml.includes('<ha-card class="compact">'));
assert(compactHtml.includes('<svg viewBox='));
card.setConfig({type:"custom:lt72-air-alert-map",region:"kauno",show_published_time:false});
assert(!card.shadowRoot.innerHTML.includes("Paskelbta: 2026-10-18 17:00"));
card.setConfig({type:"custom:lt72-air-alert-map",region:"vilniaus"});
assert.equal(card._selected,"vilniaus");
card.setConfig({type:"custom:lt72-air-alert-map"});
card.hass={states:{"sensor.lt72_demo":sampleSensor}};
assert.equal(card._selected,"kauno");
console.log("Vizualinis redaktorius ir kortos parodymo parinktys veikia.");
