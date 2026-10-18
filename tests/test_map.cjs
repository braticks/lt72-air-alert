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
  HTMLElement:class {},
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
console.log("Apskritys be įrašo – baltos, be ryšio – pilkos; oficialūs perspėjimai išsaugomi.");
