import fs from 'node:fs';

const html=fs.readFileSync('oficina360.html','utf8');
const js=fs.readFileSync('oficina360-mobile-performance-fix-v1.js','utf8');
const css=fs.readFileSync('oficina360-mobile-performance-fix-v1.css','utf8');
const fleet=fs.readFileSync('oficina360-fleet-premium-v1.js','utf8');

const must=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Missing ${label}`)};

must(html,'oficina360-mobile-performance-fix-v1.css?v=20260928-1','performance css loader');
must(html,'oficina360-mobile-performance-fix-v1.js?v=20260928-1','performance js loader');
if(html.indexOf('oficina360-mobile-performance-fix-v1.js')<html.indexOf('oficina360-fleet-premium-v1.js'))throw new Error('Performance fix must load after fleet premium');

for(const token of [
  "document.addEventListener('click',handleClick,true)",
  "document.addEventListener('input',handleInput,true)",
  'stopImmediatePropagation',
  "setAttribute('transform'",
  "setAttribute('x2'",
  'requestAnimationFrame',
  "data-pv-view",
  "fleetAssembled",
  "fleetExploded",
  "fleetRange",
  "fleetPlay"
]) must(js,token);

if(js.includes('renderScene()'))throw new Error('Performance patch must never rebuild the full scene during control animation');
must(css,'.pv-stage-toolbar{display:none!important}','duplicate legacy toolbar hidden');
must(css,'contain:layout paint style','paint containment');

// Guards the regression source: the original renderer rebuilds the scene on every animation frame/input.
must(fleet,'F.explode=Number(e.target.value)/100;renderScene()','known slider regression source');
must(fleet,'F.explode=a+d*(1-Math.pow(1-p,3));renderScene()','known animation regression source');

console.log('Oficina 360 mobile visual performance contract: OK');
