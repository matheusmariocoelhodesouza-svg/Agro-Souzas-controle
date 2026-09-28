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
assert.match(exploded,/VISTA ESTRUTURAL • NÃO OEM/,'Prévia gerada deve ser identificada como não OEM');
assert.match(exploded,/IntersectionObserver/,'Prévia legada deve carregar sob demanda para não pesar no mobile');
assert.match(exploded,/decorateDeep/,'Navegador deve tratar o layout do catálogo profundo');
assert.match(exploded,/\.o360-view-full/,'Navegador deve reconhecer as vistas profundas');
assert.match(exploded,/!v\.image_reference/,'Fallback estrutural só deve aparecer quando não existe imagem armazenada');
assert.match(exploded,/\.o360-view-table tbody tr/,'Fallback profundo deve reutilizar a numeração real dos itens catalogados');
assert.doesNotMatch(exploded,/setInterval\([^)]*miniSvg/,'Prévia não pode redesenhar continuamente');
assert.match(css,/\.o360-generated-preview/,'Estilo da prévia precisa estar presente');
assert.match(css,/\.o360-deep-preview/,'Estilo da prévia profunda precisa estar presente');
assert.match(html,/oficina360-exploded-browser-v1\.css\?v=20260928-2/,'CSS do navegador explodido precisa quebrar cache');
assert.match(html,/oficina360-spec-sheet\.js\?v=20260928-2/,'Ficha completa precisa quebrar cache da versão antiga');
assert.match(html,/oficina360-exploded-browser-v1\.js\?v=20260928-2/,'JS do navegador explodido precisa quebrar cache');

console.log('Oficina 360 specs + exploded mobile contract: OK');