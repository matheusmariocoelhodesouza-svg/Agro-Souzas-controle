from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
path=root/'index.html'
text=path.read_text(encoding='utf-8')
original=text

# Version / shell
text=text.replace('<title>Comando 360 • v7.02</title>','<title>Comando 360 • v8.00</title>')
text=text.replace('Comando 360 • v7.02','Comando 360 • v8.00')
text=text.replace("navigator.serviceWorker.register('./sw-v7-02.js'","navigator.serviceWorker.register('./sw-v8-00.js'")

# Load stable core before the large inline application script.
marker="<script>\n'use strict';"
core='<script src="./c360-core-network.js"></script>\n<script src="./c360-core-ui.js"></script>\n'
if 'src="./c360-core-network.js"' not in text:
    if marker not in text:
        raise RuntimeError('Não encontrei o início do script principal para inserir o core.')
    text=text.replace(marker,core+marker,1)

# NetworkManager is now native to the app. No module should trust Android navigator.onLine directly.
text=text.replace('navigator.onLine','c360NetOnline()')

# Company-specific identity must come from the database, never from a hardcoded client fallback.
text=re.sub(
    r"const EMPLOYER_FALLBACK=\{legal_name:'[^']*',tax_id:'[^']*'\};",
    "const EMPLOYER_FALLBACK={legal_name:'',tax_id:''};",
    text,
    count=1,
)

# Beta must remain visible and unmistakable.
text=re.sub(
    r"function cleanCompanyName\(v\)\{\n const s=String\(v\|\|\"Empresa\"\)\.replace\(/\\s\*\[•-\]\?\\s\*BETA\(\?:\\s\*-\\s\*DADOS FICTÍCIOS\)\?/gi,''\)\.trim\(\);\n return s\|\|\"Empresa\";\n\}",
    "function cleanCompanyName(v){\\n const s=String(v||'Empresa').trim();\\n return s||'Empresa';\\n}",
    text,
    count=1,
)
# Fallback if formatting of the function changed slightly.
text=text.replace(
    '''function cleanCompanyName(v){\n const s=String(v||"Empresa").replace(/\\s*[•-]?\\s*BETA(?:\\s*-\\s*DADOS FICTÍCIOS)?/gi,'').trim();\n return s||"Empresa";\n}''',
    '''function cleanCompanyName(v){\n const s=String(v||'Empresa').trim();\n return s||'Empresa';\n}'''
)

# Use company timezone in presentation/business date helpers when a timezone option is already present.
text=text.replace("timeZone:'America/Sao_Paulo'","timeZone:(companyProfile?.timezone||'America/Sao_Paulo')")
text=text.replace('timeZone:"America/Sao_Paulo"','timeZone:(companyProfile?.timezone||\'America/Sao_Paulo\')')

# Biometric evidence now lives exclusively in V2 paths.
text=text.replace("const bucket=deviceMode?'v2-attendance-selfies':'biometric-selfies';","const bucket='v2-attendance-selfies';")
text=text.replace("'/storage/v1/object/biometric-selfies/'+path","'/storage/v1/object/v2-face-references/'+path")

# Stop dual-writing face enrollment to the V1 biometric subsystem.
legacy_pattern=re.compile(
    r"\n\s*// Compatibilidade com o cadastro facial legado; falha aqui não bloqueia a Biometria V2\.\n\s*try\{await rpc\('enroll_employee_face',\{p_employee_id:employeeId,p_photo_storage_path:facePath\}\)\}\n\s*catch\(e\)\{console\.warn\('enroll_employee_face legado',e\)\}\n",
    re.M,
)
text=legacy_pattern.sub('\n',text,count=1)

if text==original:
    print('Nenhuma mudança necessária: index.html já está consolidado.')
else:
    path.write_text(text,encoding='utf-8')
    print('index.html consolidado com sucesso.')
