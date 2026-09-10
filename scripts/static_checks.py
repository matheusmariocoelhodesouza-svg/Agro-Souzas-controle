from pathlib import Path
import sys

root=Path(__file__).resolve().parents[1]
index=(root/'index.html').read_text(encoding='utf-8')
sw=(root/'sw-v8-00.js').read_text(encoding='utf-8')
errors=[]

def check(cond,msg):
    if not cond: errors.append(msg)

check('c360-core-network.js' in index,'index.html não carrega c360-core-network.js')
check('c360-core-ui.js' in index,'index.html não carrega c360-core-ui.js')
check("register('./sw-v8-00.js'" in index or 'register("./sw-v8-00.js"' in index,'index.html não registra sw-v8-00.js')
check('navigator.onLine' not in index,'index.html ainda usa navigator.onLine diretamente')
check('Nágila Severino de Araújo' not in index,'dados fixos da Agro Souza\'s ainda estão no frontend')
check('53422038000119' not in index,'CNPJ fixo ainda está no frontend')
check("rpc('enroll_employee_face'" not in index,'frontend ainda grava biometria no legado V1')
check('patchAppHtml' not in sw,'service worker v8 não pode reescrever HTML')
check("replaceAll('navigator.onLine'" not in sw,'service worker v8 ainda contém hotfix de substituição')
check((root/'c360-core-network.js').exists(),'network core ausente')
check((root/'c360-core-ui.js').exists(),'UI core ausente')

if errors:
    print('FALHAS DE CONSOLIDAÇÃO:')
    for e in errors: print(' -',e)
    sys.exit(1)
print('OK: verificações estáticas da consolidação passaram.')
