import fs from 'node:fs';

const auth=fs.readFileSync(new URL('../lavador360-auth-bridge.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../lavador360.webmanifest',import.meta.url),'utf8'));

const must=(value,message)=>{if(!value)throw new Error(message)};
new Function(auth);
must(auth.includes('#f97316'),'Tema laranja principal ausente');
must(auth.includes('l360OrangeTheme'),'Override visual laranja ausente');
must(auth.includes('lavador360-icon-192.png'),'Ícone PNG atual não aplicado na autenticação');
must(manifest.theme_color==='#f97316','Theme color do PWA não está laranja');
must(manifest.background_color==='#2a1408','Background do PWA não está no tema laranja escuro');
for(const size of [192,512]){
  const entry=manifest.icons?.find(icon=>icon.sizes===`${size}x${size}`);
  must(entry?.src?.includes(`lavador360-icon-${size}.png`)&&entry.type==='image/png',`Manifest não aponta para o PNG ${size}`);
  const path=entry.src.split('?')[0].replace(/^\//,'');
  const icon=fs.readFileSync(new URL('../'+path,import.meta.url));
  must(icon.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`Ícone ${size} não é PNG`);
  must(icon.readUInt32BE(16)===size&&icon.readUInt32BE(20)===size,`Dimensão inválida do ícone ${size}`);
}
console.log('Lavador 360 orange theme: OK');
