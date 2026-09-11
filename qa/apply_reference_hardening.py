#!/usr/bin/env python3
"""One-shot, deterministic SaaS hardening patch for Comando 360 production HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

LEGAL = "Nágila Severino de Araújo Apanha de Aves Vivas"
TAX = "53.422.038/0001-19"


def explicit_button_types(text: str) -> tuple[str, int]:
    # Safe in this app: traditional form submission is not used; actions are JS-driven.
    return re.subn(r"<button(?![^>]*\btype\s*=)([^>]*)>", r'<button type="button"\1>', text, flags=re.I)


def patch_index() -> tuple[int, int]:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    before = text

    # Company identity must come from the active tenant, never from source-code defaults.
    text = text.replace(f'value="{LEGAL}"', 'value=""')
    text = text.replace(f'value="{TAX}"', 'value=""')
    text = text.replace(repr(LEGAL), "''")
    text = text.replace(repr(TAX), "''")
    text = text.replace('"' + LEGAL + '"', "''")
    text = text.replace('"' + TAX + '"', "''")
    text = text.replace(
        'Dados do empregador definidos pelo administrador.',
        'Dados carregados automaticamente da empresa ativa no Comando 360.'
    )
    text = text.replace(
        '// Dados do empregador são fixos e não podem ser alterados nesta tela.',
        '// Dados do empregador vêm exclusivamente do cadastro da empresa ativa.'
    )

    text, buttons = explicit_button_types(text)

    if LEGAL in text or TAX in text:
        raise SystemExit('Falha: identidade específica do empregador ainda está embutida no index.html')
    if before == text:
        raise SystemExit('Falha: nenhum ajuste foi aplicado ao index.html')
    path.write_text(text, encoding="utf-8")
    return len(before) - len(text), buttons


def patch_dda() -> int:
    path = ROOT / "dda.html"
    text = path.read_text(encoding="utf-8")
    text2, buttons = explicit_button_types(text)
    if text2 != text:
        path.write_text(text2, encoding="utf-8")
    return buttons


if __name__ == '__main__':
    delta, index_buttons = patch_index()
    dda_buttons = patch_dda()
    print(f'index.html hardening: OK • explicit buttons: {index_buttons} • byte delta: {delta}')
    print(f'dda.html hardening: OK • explicit buttons: {dda_buttons}')
