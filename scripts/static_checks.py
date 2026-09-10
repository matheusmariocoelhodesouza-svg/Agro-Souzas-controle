from pathlib import Path
import sys

root=Path(__file__).resolve().parents[1]
index=(root/'index.html').read_text(encoding='utf-8')
sw=(root/'sw-v8-00.js').read_text(encoding='utf-8')
app_path=root/'app-v8.js'
css_path=root/'assets'/'app-v8.css'
app=app_path.read_text(encoding='utf-8') if app_path.exists() else ''
errors=[]

def check(cond,msg):
    if not cond: errors.append(msg)

check('c360-core-network.js' in index,'index.html não carrega c360-core-network.js')
check('c360-core-ui.js' in index,'index.html não carrega c360-core-ui.js')
check('app-v8.js' in index,'index.html não carrega app-v8.js')
check('assets/app-v8.css' in index,'index.html não carrega assets/app-v8.css')
check("const BUILD='8.00';" in index,'marcador de limpeza de cache não está na versão 8.00')
check(app_path.exists(),'app-v8.js não foi gerado')
check(css_path.exists(),'assets/app-v8.css não foi gerado')
check(len(index.encode('utf-8')) < 180_000,'index.html continua grande demais; modularização incompleta')
check("<script>\n'use strict';" not in index,'script principal ainda está embutido no index.html')
check('navigator.onLine' not in app,'app-v8.js ainda usa navigator.onLine diretamente')
check('Nágila Severino de Araújo' not in app and 'Nágila Severino de Araújo' not in index,'dados fixos da Agro Souza\'s ainda estão no frontend')
check('53422038000119' not in app and '53422038000119' not in index,'CNPJ fixo ainda está no frontend')
check("rpc('enroll_employee_face'" not in app,'frontend ainda grava biometria no legado V1')
check('v2-face-references' in app,'novas referências faciais não usam bucket V2 dedicado')
check('v2-employee-photos' in app,'novas fotos de funcionário não usam bucket V2 dedicado')
check('v2-vehicle-photos' in app,'novas fotos de veículo não usam bucket V2 dedicado')
check("register('./sw-v8-00.js'" in app or 'register("./sw-v8-00.js"' in app,'app-v8.js não registra sw-v8-00.js')
check('patchAppHtml' not in sw,'service worker v8 não pode reescrever HTML')
check("replaceAll('navigator.onLine'" not in sw,'service worker v8 ainda contém hotfix de substituição')
check('app-v8.js' in sw,'service worker não pré-carrega app-v8.js')
check('assets/app-v8.css' in sw,'service worker não pré-carrega app-v8.css')
check((root/'c360-core-network.js').exists(),'network core ausente')
check((root/'c360-core-ui.js').exists(),'UI core ausente')

if errors:
    print('FALHAS DE CONSOLIDAÇÃO:')
    for e in errors: print(' -',e)
    sys.exit(1)
print('OK: verificações estáticas da consolidação passaram.')
