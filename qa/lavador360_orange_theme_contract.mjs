import fs from 'node:fs';

const auth=fs.readFileSync(new URL('../lavador360-auth-bridge.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../lavador360.webmanifest',import.meta.url),'utf8'));
const icon=fs.readFileSync(new URL('../lavador360-icon-orange.svg',import.meta.url),'utf8');

const must=(value,message)=>{if(!value)throw new Error(message)};
new Function(auth);
must(auth.includes('#f97316'),'Tema laranja principal ausente');
must(auth.includes('l360OrangeTheme'),'Override visual laranja ausente');
must(auth.includes('lavador360-icon-orange.svg'),'Ícone laranja versionado não aplicado');
must(manifest.theme_color==='#f97316','Theme color do PWA não está laranja');
must(manifest.background_color==='#2a1408','Background do PWA não está no tema laranja escuro');
must(manifest.icons?.[0]?.src?.includes('lavador360-icon-orange.svg'),'Manifest não aponta para o ícone laranja');
must(icon.includes('#f97316')&&icon.includes('L360'),'Ícone laranja inválido');
console.log('Lavador 360 orange theme: OK');
