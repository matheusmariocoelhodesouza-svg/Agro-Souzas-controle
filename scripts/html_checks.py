from html.parser import HTMLParser
from pathlib import Path
from collections import Counter
import sys

root=Path(__file__).resolve().parents[1]
index_path=root/'index.html'
html=index_path.read_text(encoding='utf-8')

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids=[]
        self.local_refs=[]
        self.forms=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if data.get('id'):
            self.ids.append(data['id'])
        ref=None
        if tag=='script': ref=data.get('src')
        elif tag=='link': ref=data.get('href')
        elif tag in ('img','source'): ref=data.get('src')
        if ref and (ref.startswith('./') or ref.startswith('/')):
            self.local_refs.append((tag,ref))

p=AuditParser();p.feed(html)
errors=[]
warnings=[]

dupes=sorted(k for k,v in Counter(p.ids).items() if v>1)
if dupes:
    errors.append('IDs HTML duplicados: '+', '.join(dupes[:40]))

for tag,ref in p.local_refs:
    clean=ref.split('?',1)[0].split('#',1)[0]
    rel=clean[2:] if clean.startswith('./') else clean.lstrip('/')
    if not rel: continue
    target=root/rel
    if not target.exists():
        errors.append(f'Referência local inexistente ({tag}): {ref}')

required_ids=[
    'login','app','companyName','v2sidebar','networkBadge','logout',
    'equipehome','apanha','ponto','combustivel','relatorios',
    'funcionarios','frota','manutencoes','financeiro','configuracoes'
]
missing=[x for x in required_ids if x not in p.ids]
if missing:
    errors.append('Telas/elementos essenciais ausentes: '+', '.join(missing))

if html.count('<script src="./app-v8.js"></script>')!=1:
    errors.append('app-v8.js deve ser carregado exatamente uma vez')
if html.count('<script src="./c360-core-network.js"></script>')!=1:
    errors.append('c360-core-network.js deve ser carregado exatamente uma vez')
if html.count('<script src="./c360-core-ui.js"></script>')!=1:
    errors.append('c360-core-ui.js deve ser carregado exatamente uma vez')

if errors:
    print('FALHAS HTML:')
    for e in errors: print(' -',e)
    sys.exit(1)
print(f'OK: HTML válido para auditoria estrutural • {len(p.ids)} IDs únicos • {len(p.local_refs)} referências locais verificadas.')
