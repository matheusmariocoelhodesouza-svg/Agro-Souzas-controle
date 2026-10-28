import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
const index=fs.readFileSync('index.html','utf8');
assert(!index.includes('data-teamtab="ia"'));assert(index.includes('id="poTruckPhotoRead"'));
const dom=new JSDOM('<body class="device-mode"><div id="equipehome"></div><div id="ia"></div></body>',{url:'https://qa.invalid',runScripts:'outside-only'}),w=dom.window,routes=[];
w.deviceMode=true;w.deviceAccess={permissions:{}};w.v2Go=async route=>routes.push(route);
w.eval(fs.readFileSync('c360-field-route-guard.js','utf8'));
try{
 await w.v2Go('ia');assert.equal(routes.at(-1),'equipehome');await w.v2Go('financeiro');assert.equal(routes.at(-1),'equipehome');await w.v2Go('operacoes');assert.equal(routes.at(-1),'operacoes');
 console.log('PASS Field home has no IA tile; Apanha is available and standalone AI/admin routes are blocked');
 w.deviceMode=false;w.document.body.classList.remove('device-mode');await w.v2Go('ia');assert.equal(routes.at(-1),'ia');console.log('PASS The administrative assistant remains available');
}finally{w.close()}
