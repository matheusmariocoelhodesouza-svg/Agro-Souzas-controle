#!/usr/bin/env python3
"""Reference-grade static QA for Comando 360.

Checks production HTML/PWA wiring without requiring credentials or live data.
The goal is to fail on structural regressions and print actionable warnings for
quality debt that should be reviewed but may be intentional.
"""
from __future__ import annotations

from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [ROOT / "index.html", ROOT / "dda.html"]
REQUIRED_SECTIONS = {
    "index.html": {"inicio", "frota", "financeiro"},
}
BUILTIN_HANDLERS = {
    "alert", "confirm", "prompt", "print", "open", "close",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval",
}
SOURCE_MARKERS = (
    "document.", "querySelector", "getElementById", "addEventListener",
    "function ", "const ", "let ", "=>", "setTimeout", "window.",
    "try{", "catch(", "innerHTML", "employees.map", "events.filter",
    "Object.fromEntries", "currentEmployees",
)
SOURCE_EXCLUDED_TAGS = {"script", "style", "noscript", "textarea", "pre", "code", "option"}

class AuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[tuple[str, int]] = []
        self.id_attrs: dict[str, tuple[dict[str, str | None], int]] = {}
        self.refs: list[tuple[str, str, int]] = []
        self.fragment_refs: list[tuple[str, int]] = []
        self.label_fors: list[tuple[str, int]] = []
        self.inline_handlers: list[tuple[str, str, int]] = []
        self.buttons_without_type: list[int] = []
        self.images_without_alt: list[int] = []
        self.forms_without_submit_control: list[int] = []
        self.visible_source_nodes: list[tuple[int, str]] = []
        self._form_stack: list[dict] = []
        self._tag_stack: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line, _ = self.getpos()
        self._tag_stack.append(tag)
        if "id" in attrs and attrs["id"]:
            self.ids.append((attrs["id"], line))
            self.id_attrs[attrs["id"]] = (attrs, line)
        if tag == "label" and attrs.get("for"):
            self.label_fors.append((attrs["for"], line))
        if tag == "button" and not attrs.get("type"):
            self.buttons_without_type.append(line)
        if tag == "img" and "alt" not in attrs:
            self.images_without_alt.append(line)
        if tag == "form":
            self._form_stack.append({"line": line, "submit": False})
        if self._form_stack and (
            (tag == "button" and attrs.get("type", "submit").lower() == "submit")
            or (tag == "input" and attrs.get("type", "text").lower() == "submit")
        ):
            self._form_stack[-1]["submit"] = True
        for attr in ("src", "href"):
            value = attrs.get(attr)
            if not value:
                continue
            if attr == "href" and value.startswith("#"):
                frag = value[1:]
                if frag:
                    self.fragment_refs.append((frag, line))
                continue
            self.refs.append((attr, value, line))
        for name, value in attrs.items():
            if name.startswith("on") and value:
                self.inline_handlers.append((name, value, line))

    def handle_startendtag(self, tag, attrs):
        # Reuse validations without leaving a void element on the stack.
        self.handle_starttag(tag, attrs)
        if self._tag_stack and self._tag_stack[-1] == tag:
            self._tag_stack.pop()

    def handle_endtag(self, tag):
        if tag == "form" and self._form_stack:
            f = self._form_stack.pop()
            if not f["submit"]:
                self.forms_without_submit_control.append(f["line"])
        for i in range(len(self._tag_stack) - 1, -1, -1):
            if self._tag_stack[i] == tag:
                del self._tag_stack[i:]
                break

    def handle_data(self, data):
        text = (data or "").strip()
        if len(text) < 35:
            return
        if any(tag in SOURCE_EXCLUDED_TAGS for tag in self._tag_stack):
            return
        hits = sum(1 for marker in SOURCE_MARKERS if marker in text)
        if hits >= 2:
            line, _ = self.getpos()
            compact = re.sub(r"\s+", " ", text)[:220]
            self.visible_source_nodes.append((line, compact))


def local_path(value: str) -> Path | None:
    v = value.strip()
    if not v or v.startswith(("#", "data:", "blob:", "javascript:", "mailto:", "tel:")):
        return None
    u = urlsplit(v)
    if u.scheme or u.netloc:
        return None
    clean = u.path
    if not clean or clean in (".", "./", "/"):
        return ROOT / "index.html"
    clean = clean.lstrip("/")
    return (ROOT / clean).resolve()


def discover_js_symbols(texts: list[str]) -> set[str]:
    symbols: set[str] = set()
    patterns = [
        r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(",
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=",
        r"\bwindow\.([A-Za-z_$][\w$]*)\s*=",
        r"\bglobalThis\.([A-Za-z_$][\w$]*)\s*=",
        r"(?:^|[;\n}]\s*)([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b",
        r"(?:^|[;\n}]\s*)([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>",
    ]
    for text in texts:
        for pat in patterns:
            symbols.update(re.findall(pat, text, flags=re.M))
    return symbols


def check_tenant_neutrality(index_text: str, parser: AuditParser, errors: list[str]) -> None:
    """Prevent a future tenant from inheriting another company's identity."""
    for field_id in ("companyLegalName", "companyTaxId"):
        item = parser.id_attrs.get(field_id)
        if not item:
            continue
        attrs, line = item
        if (attrs.get("value") or "").strip():
            errors.append(
                f"index.html:{line}: #{field_id} possui valor estático; identidade da empresa deve vir do tenant ativo"
            )

    fallback = re.search(
        r"\bEMPLOYER_FALLBACK\s*=\s*\{(?P<body>.*?)\}",
        index_text,
        flags=re.S,
    )
    if fallback:
        body = fallback.group("body")
        for key in ("legal_name", "tax_id"):
            m = re.search(rf"\b{key}\s*:\s*(['\"])(.*?)\1", body, flags=re.S)
            if m and m.group(2).strip():
                errors.append(
                    f"index.html: EMPLOYER_FALLBACK.{key} não pode conter identidade de uma empresa específica"
                )


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    parsers: dict[str, AuditParser] = {}
    html_texts: dict[str, str] = {}
    js_texts: list[str] = []

    for path in HTML_FILES:
        if not path.is_file():
            errors.append(f"{path.name}: arquivo obrigatório ausente")
            continue
        text = path.read_text(encoding="utf-8")
        html_texts[path.name] = text
        parser = AuditParser()
        parser.feed(text)
        parser.close()
        parsers[path.name] = parser
        js_texts.append(text)

    for js in ROOT.glob("*.js"):
        try:
            js_texts.append(js.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            pass
    symbols = discover_js_symbols(js_texts)

    for name, parser in parsers.items():
        id_lines = defaultdict(list)
        for value, line in parser.ids:
            id_lines[value].append(line)
        for value, lines in sorted(id_lines.items()):
            if len(lines) > 1:
                errors.append(f"{name}: id duplicado #{value} nas linhas {lines}")
        ids = set(id_lines)

        for line, excerpt in parser.visible_source_nodes:
            errors.append(f"{name}:{line}: possível código JavaScript renderizado como texto: {excerpt}")

        for target, line in parser.label_fors:
            if target not in ids:
                errors.append(f"{name}:{line}: label for=\"{target}\" aponta para id inexistente")
        for target, line in parser.fragment_refs:
            if target not in ids:
                errors.append(f"{name}:{line}: href=\"#{target}\" aponta para id inexistente")
        for attr, value, line in parser.refs:
            p = local_path(value)
            if p is not None and not p.exists():
                errors.append(f"{name}:{line}: {attr}=\"{value}\" aponta para arquivo local ausente")

        for event_name, code, line in parser.inline_handlers:
            m = re.match(r"\s*([A-Za-z_$][\w$]*)\s*\(", code)
            if not m:
                continue
            fn = m.group(1)
            if fn not in symbols and fn not in BUILTIN_HANDLERS:
                errors.append(f"{name}:{line}: {event_name} chama {fn}(), mas o símbolo não foi encontrado")

        required = REQUIRED_SECTIONS.get(name, set())
        for section_id in sorted(required - ids):
            errors.append(f"{name}: seção essencial #{section_id} ausente")

        if parser.buttons_without_type:
            errors.append(
                f"{name}: {len(parser.buttons_without_type)} botão(ões) sem type explícito "
                f"(primeiras linhas: {parser.buttons_without_type[:8]})"
            )
        if parser.images_without_alt:
            warnings.append(f"{name}: {len(parser.images_without_alt)} imagem(ns) sem atributo alt (primeiras linhas: {parser.images_without_alt[:8]})")
        if parser.forms_without_submit_control:
            warnings.append(f"{name}: {len(parser.forms_without_submit_control)} form(s) sem controle submit explícito (linhas: {parser.forms_without_submit_control[:8]})")

    if "index.html" in parsers:
        check_tenant_neutrality(html_texts["index.html"], parsers["index.html"], errors)

    manifest = ROOT / "comando360.webmanifest"
    if manifest.exists():
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            for key in ("name", "short_name", "start_url", "display"):
                if not data.get(key):
                    errors.append(f"comando360.webmanifest: campo obrigatório/recomendado ausente: {key}")
            for icon in data.get("icons", []):
                src = icon.get("src")
                if src:
                    p = local_path(src)
                    if p is not None and not p.exists():
                        errors.append(f"comando360.webmanifest: ícone ausente: {src}")
        except Exception as e:
            errors.append(f"comando360.webmanifest: JSON inválido: {e}")
    else:
        errors.append("comando360.webmanifest: ausente")

    sw = ROOT / "sw-v7-02.js"
    if not sw.exists():
        errors.append("sw-v7-02.js: ausente")
    else:
        sw_text = sw.read_text(encoding="utf-8")
        m = re.search(r"const\s+CORE\s*=\s*\[(.*?)\]", sw_text, flags=re.S)
        if not m:
            errors.append("sw-v7-02.js: lista CORE não encontrada")
        else:
            for ref in re.findall(r"['\"]([^'\"]+)['\"]", m.group(1)):
                p = local_path(ref)
                if p is not None and not p.exists():
                    errors.append(f"sw-v7-02.js: CORE referencia arquivo ausente: {ref}")
        if "isAppShellNavigation" not in sw_text:
            errors.append("sw-v7-02.js: proteção de navegação do app shell ausente")

    # Architecture debt signals. These are warnings, not blockers.
    legacy_candidates = [
        "index-6.html", "index.html.html", "manifest.webmanifest",
        "operza.webmanifest", "agro-souzas-controle-v7.webmanifest",
        "Correcao_V8_6_2_Navegacao_Automatica.zip", "LEIA-ME.txt",
    ]
    for item in legacy_candidates:
        if (ROOT / item).exists():
            warnings.append(f"legado/revisar: {item} ainda existe na raiz")

    index = ROOT / "index.html"
    if index.exists() and index.stat().st_size > 500_000:
        warnings.append(f"arquitetura: index.html tem {index.stat().st_size:,} bytes; considerar modularização")

    print("=== COMANDO 360 • REFERENCE AUDIT ===")
    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(" -", w)
    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(" -", e)
        print("\nRESULT: FAIL")
        return 1
    print("\nRESULT: PASS")
    return 0

if __name__ == "__main__":
    sys.exit(main())
