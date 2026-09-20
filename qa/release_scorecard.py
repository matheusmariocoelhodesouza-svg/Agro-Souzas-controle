#!/usr/bin/env python3
"""Comando 360 release scorecard.

This is a release contract, not a marketing rating. It converts five quality
areas into reproducible repository checks. A category below 95 blocks release;
browser QA, production smoke and database tests remain separate gates.
"""
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]

class Category:
    def __init__(self,name): self.name=name; self.items=[]
    def check(self,label,points,ok): self.items.append((label,points,bool(ok)))
    @property
    def total(self): return sum(p for _,p,_ in self.items)
    @property
    def earned(self): return sum(p for _,p,ok in self.items if ok)
    @property
    def score(self): return round(100*self.earned/self.total,1) if self.total else 0

def text(path): return (ROOT/path).read_text(encoding='utf-8')
def exists(path): return (ROOT/path).is_file() and (ROOT/path).stat().st_size>0

def main():
    index=text('index.html')
    boot=text('c360-quality-hotfix.js')
    release_css=text('c360-release-core.css')
    release_js=text('c360-release-core.js')
    sw_loader=text('sw-v7-02.js')
    sw_ref=re.search(r"importScripts\(['\"]([^'\"]+)['\"]\)",sw_loader)
    sw_path=sw_ref.group(1).split('?',1)[0].replace('./','') if sw_ref else ''
    sw=text(sw_path) if sw_path and exists(sw_path) else ''

    security=Category('Segurança')
    security.check('hardening multiempresa versionado',20,exists('supabase/migrations/20260913120000_harden_multitenant_security_v1.sql'))
    security.check('tabelas internas com deny explícito',20,exists('supabase/migrations/20260920122000_explicit_internal_table_deny_policies.sql'))
    security.check('refresh do aparelho preserva metadados de segurança',20,exists('supabase/migrations/20260920122100_preserve_device_security_metadata.sql') and '|| coalesce(p_device_info' in text('supabase/migrations/20260920122100_preserve_device_security_metadata.sql'))
    browser='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in ROOT.glob('*') if p.suffix in {'.js','.html'})
    secret_re=re.compile(r"(?:service[_-]?role|client_secret)\s*[:=]\s*['\"][A-Za-z0-9_.-]{20,}",re.I)
    security.check('sem segredo privilegiado embutido no navegador',20,not secret_re.search(browser))
    activation=text('supabase/functions/comando360-device-activate/index.ts')
    security.check('código de pareamento validado antes de criar usuário técnico',20,'v2_device_pairing_codes' in activation and 'admin.auth.admin.createUser' in activation and activation.index('v2_device_pairing_codes')<activation.index('admin.auth.admin.createUser'))

    performance=Category('Velocidade')
    performance.check('shell principal abaixo de 700 KB',20,(ROOT/'index.html').stat().st_size<=700_000)
    performance.check('CSS carregado em paralelo',20,'loadStylesParallel' in boot and 'Promise.allSettled' in boot)
    performance.check('scripts baixados concorrentemente com ordem preservada',20,'loadScriptsOrderedParallel' in boot and 's.async=false' in boot)
    performance.check('preconnect para backend/CDN',10,"preconnect('https://aycbrqziusxtxhsdfqjk.supabase.co')" in boot and "preconnect('https://cdn.jsdelivr.net')" in boot)
    m=re.search(r'const\s+CONCURRENCY\s*=\s*(\d+)',sw)
    performance.check('cache PWA concorrente >= 8',15,bool(m and int(m.group(1))>=8))
    performance.check('renderização fora da tela otimizada',15,'content-visibility:auto' in release_css)

    ux=Category('Beleza + UX/Acessibilidade')
    ux.check('foco de teclado claramente visível',20,':focus-visible' in release_css)
    ux.check('alvos de toque de pelo menos 44 px',20,'min-height:44px' in release_css)
    ux.check('respeita preferência de movimento reduzido',20,'prefers-reduced-motion' in release_css)
    ux.check('região viva para feedback acessível',20,'aria-live' in release_js and 'c360-release-live' in release_js)
    ux.check('links externos e imagens endurecidos/otimizados',20,'noopener' in release_js and "img.loading='lazy'" in release_js)

    reliability=Category('Confiabilidade')
    reliability.check('rollback automático disponível no PWA',25,'C360_ROLLBACK_TO_STABLE' in sw)
    reliability.check('cache estável separado da versão atual',20,'comando360-stable-v1' in sw)
    reliability.check('autorecovery do cliente presente',15,exists('c360-autorecovery.js'))
    reliability.check('fila/offline de campo presente',15,exists('c360-field-offline-hotfix.js'))
    reliability.check('heartbeat de saúde presente',10,exists('c360-system-health.js') and 'v2_device_health_heartbeat' in text('c360-system-health.js'))
    reliability.check('tracker Android reinicia e mantém fila local',15,exists('android-tracker/app/src/main/java/br/com/comando360/tracker/BootReceiver.kt') and exists('android-tracker/app/src/main/java/br/com/comando360/tracker/LocationQueue.kt'))

    functionality=Category('Funcionalidade')
    required=['c360-platform.js','c360-product-core.js','c360-team-chat.js','c360-device-control.js','c360-native-tracker-admin.js','c360-fiscal.js','c360-trailer-hitches.js']
    functionality.check('módulos essenciais presentes',20,all(exists(x) for x in required))
    functionality.check('dashboard, frota e financeiro continuam no shell',20,all(re.search(rf'id=["\']{x}["\']',index) for x in ('inicio','frota','financeiro')))
    functionality.check('teste real de navegador versionado',15,exists('qa/reference_ui.mjs') and exists('.github/workflows/reference-ui.yml'))
    functionality.check('smoke de banco versionado',15,exists('tests/quality-db-smoke.sql'))
    functionality.check('stress de 1.000 usuários e perfil 3.000',15,exists('qa/user_stress_1000.mjs') and exists('qa/profile_stress_3000.mjs'))
    functionality.check('build automatizado do tracker Android',15,exists('.github/workflows/android-tracker-build.yml'))

    categories=[security,performance,ux,reliability,functionality]
    failed=False
    print('=== COMANDO 360 • RELEASE SCORECARD ===')
    for c in categories:
        print(f'\n{c.name}: {c.score:.1f}/100')
        for label,points,ok in c.items:
            print(f"  {'✓' if ok else '✗'} {points:>2} pts — {label}")
        if c.score<95: failed=True
    average=round(sum(c.score for c in categories)/len(categories),1)
    print(f'\nMÉDIA: {average:.1f}/100 • mínimo por categoria: 95.0')
    if failed or average<95:
        print('RESULT: FAIL — release bloqueada')
        return 1
    print('RESULT: PASS — contrato automatizado >= 9,5/10')
    return 0

if __name__=='__main__': sys.exit(main())
