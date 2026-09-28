import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const specs=read('oficina360-spec-sheet.js');
const exploded=read('oficina360-exploded-browser-v1.js');
const css=read('oficina360-exploded-browser-v1.css');
const html=read('oficina360.html');

assert.match(specs,/function activateSpecs\(\)/,'Ficha completa precisa de ativação própria');
assert.match(specs,/t\.id==='tab-specs'/,'Ficha completa deve ativar tab-specs');
assert.match(specs,/b\.dataset\.tab==='specs'/,'Ficha completa deve marcar o botão correto');
assert.match(specs,/load\(\)\.catch/,'Ficha completa deve carregar os dados ao abrir');

assert.match(exploded,/o360-open-view/,'Vistas devem expor botão de abertura interativa');
assert.match(exploded,/data-fleet-view/,'Navegador deve localizar a prancha Premium correspondente');
assert.match(exploded,/pvSystem/,'Navegador deve selecionar o sistema técnico correspondente');
assert.match(exploded,/VISUAL ESTRUTURAL • NÃO OEM/,'Prévia gerada deve ser identificada como não OEM');
assert.match(exploded,/IntersectionObserver/,'Prévia deve carregar sob demanda para não pesar no mobile');
assert.doesNotMatch(exploded,/setInterval\([^)]*miniSvg/,'Prévia não pode redesenhar continuamente');
assert.match(css,/\.o360-generated-preview/,'Estilo da prévia precisa estar presente');
assert.match(html,/oficina360-exploded-browser-v1\.css\?v=20260928-1/,'CSS do navegador explodido deve estar carregado');
assert.match(html,/oficina360-spec-sheet\.js\?v=20260928-2/,'Ficha completa precisa quebrar cache da versão antiga');
assert.match(html,/oficina360-exploded-browser-v1\.js\?v=20260928-1/,'JS do navegador explodido deve estar carregado');

console.log('Oficina 360 specs + exploded mobile contract: OK');
