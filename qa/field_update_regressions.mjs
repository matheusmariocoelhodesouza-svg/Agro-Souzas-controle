import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),{JSDOM,VirtualConsole}=require(process.env.C360_JSDOM_PATH||'jsdom');
const html=fs.readFileSync('atualizar-campo.html','utf8'),inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0))};
function fixture(options={}){
 const dom=new JSDOM(html,{url:'https://qa.invalid/atualizar-campo.html',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window;
 const requests=[],saved={session:'synthetic-session',deviceCode:'keep-linked',offlineQueue:'[{"pending":"poultry-truck"}]'};
 for(const [k,v] of Object.entries(saved))w.localStorage.setItem(k,v);
 w.MessageChannel=class{constructor(){this.port1={close(){},onmessage:null};this.port2={close(){},postMessage:value=>queueMicrotask(()=>this.port1.onmessage?.({data:value}))}}};
 const worker={state:'activated',postMessage(message,ports){requests.push(message.type);let value;if(message.type==='C360_STATUS')value={ok:true,current:'comando360-v7-02-stable'+(options.release||85),rollback:!!options.rollback};if(message.type==='C360_HEAL_CORE')value={ok:!options.healFailure,hasShell:true,shellRefreshed:!options.healFailure};if(message.type==='C360_CLEAR_ROLLBACK')value={ok:true,rollback:false};ports[0].postMessage(value)}};
 const registration=Object.assign(new w.EventTarget(),{active:worker,installing:null,waiting:null,async update(){requests.push('registration.update')}});
 Object.defineProperty(w.navigator,'serviceWorker',{value:{async getRegistration(){requests.push('getRegistration');return registration},async register(url,options){requests.push('register:'+url);assert.equal(options.scope,'./');assert.equal(options.updateViaCache,'none');return registration}}});
 Object.defineProperty(w.navigator,'onLine',{value:!options.offline});
 w.indexedDB={deleteDatabase(){throw Error('Must preserve offline records')}};w.caches={delete(){throw Error('Must not purge app data')}};
 w.fetch=async()=>new Response(options.oldHtml?'<html>Old home</html>':'<button data-teamtab="ia">IA de campo</button>',{status:200});
 // Observe navigation without replacing this test's DOM. The production code still uses location.replace.
 w.eval(inline.replace("window.location.replace('./?campo_atualizado=85');","window.__destination='./?campo_atualizado=85';"));
 return {w,dom,requests,saved,registration,close:()=>w.close()};
}
async function test(name,options,check){const r=fixture(options);try{await tick();await check(r);for(const [k,v] of Object.entries(r.saved))assert.equal(r.w.localStorage.getItem(k),v);console.log('PASS '+name)}finally{r.close()}}
await test('The updater refreshes the existing worker and opens IA without clearing pairing, session or queued records',{},r=>{assert.equal(r.w.__destination,'./?campo_atualizado=85');assert(r.requests.includes('register:./sw-v7-02.js?release=20261028-field-ai85'));assert(r.requests.includes('C360_HEAL_CORE'));assert.equal(r.w.document.querySelector('#retry').hidden,true)});
await test('A verified new release clears a forced old-screen fallback while retaining local records',{rollback:true},r=>{assert(r.requests.includes('C360_CLEAR_ROLLBACK'));assert.equal(r.w.__destination,'./?campo_atualizado=85')});
await test('An old worker never reports a successful update',{release:81},r=>{assert.equal(r.w.__destination,undefined);assert.equal(r.w.document.querySelector('#retry').hidden,false);assert(!r.requests.includes('C360_HEAL_CORE'))});
await test('A failed download stays retryable and cannot send the user to an incomplete app',{healFailure:true},r=>{assert.equal(r.w.__destination,undefined);assert.equal(r.w.document.querySelector('#retry').hidden,false)});
await test('A home page without the IA tile cannot pass verification',{oldHtml:true},r=>{assert.equal(r.w.__destination,undefined);assert.match(r.w.document.querySelector('#status').textContent,/IA/)});
await test('Offline phones retain their session and queue and get a clear reconnect action',{offline:true},r=>{assert.equal(r.w.__destination,undefined);assert.equal(r.requests.length,0);assert.match(r.w.document.querySelector('#status').textContent,/internet/)});
const r=fixture();try{
 await tick();const old=r.registration.active,newWorker=new r.w.EventTarget();newWorker.state='installing';r.registration.installing=newWorker;
 let resolved=false;const pending=r.w.C360AppUpdate.activeWorker(r.registration,200).then(w=>{resolved=true;return w});await tick();assert.equal(resolved,false);
 r.registration.installing=null;r.registration.active={...old,state:'activated'};newWorker.state='activated';newWorker.dispatchEvent(new r.w.Event('statechange'));assert.equal(await pending,r.registration.active);console.log('PASS An update waits for the new worker instead of redirecting while installation is incomplete');
}finally{r.close()}

// The normal shell and its early offline bootstrap must not replace each other's worker.
const index=fs.readFileSync('index.html','utf8'),early=fs.readFileSync('c360-field-offline-hotfix.js','utf8');
const mainUrl=index.match(/navigator\.serviceWorker\.register\('([^']+)'/)[1],earlyUrl=early.match(/const SW_URL='([^']+)'/)[1],helperUrl=inline.match(/navigator\.serviceWorker\.register\('([^']+)'/)[1];
assert.equal(mainUrl,earlyUrl);assert.equal(mainUrl,helperUrl);console.log('PASS Every app entry uses the same worker URL and scope, preventing a silent downgrade');

// Exercise real worker fetch handlers with a failed network, rather than only checking cached file names.
const workerFile=fs.readFileSync('sw-v7-02.js','utf8').match(/importScripts\('\.\/(sw-v7-02-core-[^']+)'/)[1];
const handlers={},network=[],stores=new Map();const origin='https://qa.invalid/';
function cacheStore(name){if(!stores.has(name)){const values=new Map();stores.set(name,{async match(key){return values.get(new URL(typeof key==='string'?key:key.url,origin).href)?.clone()||null},async put(key,value){values.set(new URL(typeof key==='string'?key:key.url,origin).href,value.clone())}})}return stores.get(name)}
const current=fs.readFileSync(workerFile,'utf8').match(/const CACHE='([^']+)'/)[1];
const cached=cacheStore(current);await cached.put('./index.html',new Response('<html>Saved offline home</html>'));
const sandbox={URL,Response,Request,AbortController,setTimeout,clearTimeout,console,fetch:async url=>{network.push(String(url));throw TypeError('offline')},caches:{open:async name=>cacheStore(name)},self:{registration:{scope:origin},location:{origin:new URL(origin).origin},addEventListener(type,fn){handlers[type]=fn}}};
vm.runInNewContext(fs.readFileSync(workerFile,'utf8'),sandbox);
let responsePromise;handlers.fetch({request:{url:origin+'?qa=offline',method:'GET',mode:'navigate'},respondWith(p){responsePromise=p}});
assert.match(await (await responsePromise).text(),/Saved offline home/);assert.equal(new URL(network[0]).searchParams.get('c360_release'),current);console.log('PASS Release-specific network requests still return the saved home when offline');
sandbox.fetch=async url=>{network.push(String(url));return new Response('Fresh bundle')};
assert.equal(await sandbox.cacheOne(cached,'./c360-quality-hotfix.js',1000),true);assert.equal(new URL(network.at(-1)).searchParams.get('c360_release'),current);assert.equal(await (await cached.match('./c360-quality-hotfix.js')).text(),'Fresh bundle');console.log('PASS Downloads bypass stale intermediary responses and retain canonical offline cache keys');
