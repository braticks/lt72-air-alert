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
console.log("10 apskričių geometrijos ir koordinatės yra tinkamos.");
