#!/usr/bin/env python3
"""
Scans every cog in COGS_DIR and writes a single data/commands.json that the
commands page renders. Run this after adding/editing commands (or let the
GitHub Action in .github/workflows/update-commands.yml run it for you on
every push) - the site never needs to be hand-edited again.

Usage:
    python scripts/generate_commands.py [cogs_dir] [output_path]
"""

import ast
import bisect
import json
import re
import sys
from pathlib import Path

COGS_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("cogs")
OUTPUT_PATH = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("data/commands.json")

SECTION_RE = re.compile(r"^\s*#\s*=+\s*(.+?)\s*=+\s*$")

# Cosmetic - tweak freely. Anything not listed just gets a generic icon.
CATEGORY_ICON = {
    "moderation": "shield",
    "general commands": "sparkles",
    "webhook commands": "webhook",
    "giveaway commands": "gift",
    "server stats": "server",
    "utility": "wrench",
    "fun": "smile",
    "booster roles": "crown",
}
DEFAULT_ICON = "sparkles"

# Controls the order categories appear in on the page - anything found that
# isn't listed here just gets appended at the end, alphabetically. Names must
# match the section-comment text in the cogs (Title Cased) or the Cog class
# name, split on capitals (e.g. ServerManagement -> "Server Management").
CATEGORY_ORDER = [
    "General Commands",
    "Moderation",
    "Utility",
    "Fun",
    "Server Stats",
    "Booster Roles",
    "Webhook Commands",
    "Giveaway Commands",
]


def humanize_class_name(name: str) -> str:
    """ServerManagement -> Server Management"""
    return re.sub(r"(?<!^)(?=[A-Z])", " ", name).strip()


def humanize_section(title: str) -> str:
    """GENERAL COMMANDS -> General"""
    return title.strip().title()


def find_section_markers(source: str):
    """Returns a sorted list of (line_number, section_title) for every
    '# === SECTION ===' style comment in the file."""
    markers = []
    for i, line in enumerate(source.splitlines(), start=1):
        m = SECTION_RE.match(line)
        if m:
            markers.append((i, humanize_section(m.group(1))))
    markers.sort()
    return markers


def section_for_line(markers, lineno):
    if not markers:
        return None
    lines = [m[0] for m in markers]
    idx = bisect.bisect_right(lines, lineno) - 1
    if idx < 0:
        return None
    return markers[idx][1]


def get_call_name(deco):
    """Given a decorator node, return (owner, attr) e.g. commands.command ->
    ('commands', 'command'), staffrole.command -> ('staffrole', 'command').
    Returns (None, None) if it doesn't match the shape we care about."""
    func = deco.func if isinstance(deco, ast.Call) else deco
    if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
        return func.value.id, func.attr
    return None, None


def literal(node):
    try:
        return ast.literal_eval(node)
    except Exception:
        return None


def extract_kwargs(deco):
    kwargs = {}
    if isinstance(deco, ast.Call):
        for kw in deco.keywords:
            if kw.arg:
                kwargs[kw.arg] = literal(kw.value)
    return kwargs


def docstring_first_line(node):
    doc = ast.get_docstring(node)
    if not doc:
        return None
    return doc.strip().splitlines()[0].strip()


PERM_DECORATORS = {"has_permissions"}


def readable_perm(key: str) -> str:
    return key.replace("_", " ").title()


def parse_cog_file(path: Path):
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    section_markers = find_section_markers(source)

    cogs = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        is_cog = any(
            (isinstance(b, ast.Attribute) and b.attr == "Cog")
            or (isinstance(b, ast.Name) and b.id == "Cog")
            for b in node.bases
        )
        if not is_cog:
            continue

        cog_name = humanize_class_name(node.name)
        cog_doc = ast.get_docstring(node)

        # func_name -> command display name (as registered with discord.py)
        cmd_name_of = {}
        # func_name -> parent func_name, for subcommands of a group
        parent_of = {}
        command_nodes = {}  # func_name -> (funcdef_node, deco_node)

        for item in node.body:
            if not isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for deco in item.decorator_list:
                owner, attr = get_call_name(deco)
                if attr not in ("command", "group"):
                    continue
                kwargs = extract_kwargs(deco)
                display_name = kwargs.get("name") or item.name
                cmd_name_of[item.name] = display_name
                command_nodes[item.name] = (item, deco)
                if owner != "commands":
                    parent_of[item.name] = owner
                break  # only one command/group decorator per function

        def full_path(func_name):
            parts = [cmd_name_of[func_name]]
            cur = func_name
            while cur in parent_of:
                cur = parent_of[cur]
                if cur not in cmd_name_of:
                    break
                parts.insert(0, cmd_name_of[cur])
            return " ".join(parts)

        commands_out = []
        for func_name, (item, deco) in command_nodes.items():
            kwargs = extract_kwargs(deco)
            description = kwargs.get("description") or kwargs.get("help") or docstring_first_line(item) or "No description provided."
            aliases = kwargs.get("aliases") or []
            if isinstance(aliases, (list, tuple)):
                aliases = [a for a in aliases if isinstance(a, str)]
            else:
                aliases = []

            perms = []
            for d in item.decorator_list:
                owner, attr = get_call_name(d)
                if attr in PERM_DECORATORS and isinstance(d, ast.Call):
                    for kw in d.keywords:
                        val = literal(kw.value)
                        if kw.arg and val is True:
                            perms.append(readable_perm(kw.arg))
                elif attr == "is_owner":
                    perms.append("Bot Owner")
            perms = list(dict.fromkeys(perms))  # dedupe, keep order

            section = section_for_line(section_markers, item.lineno)
            category = humanize_section(section) if section else cog_name

            commands_out.append({
                "name": full_path(func_name),
                "description": description,
                "aliases": aliases,
                "permissions": perms,
                "is_group": any(get_call_name(d)[1] == "group" for d in item.decorator_list),
                "category": category,
                "_line": item.lineno,
            })

        commands_out.sort(key=lambda c: c["_line"])
        for c in commands_out:
            del c["_line"]

        cogs.append({
            "cog": cog_name,
            "description": cog_doc,
            "commands": commands_out,
        })

    return cogs


def order_key(category: str):
    try:
        return (0, CATEGORY_ORDER.index(category))
    except ValueError:
        return (1, category.lower())


def main():
    if not COGS_DIR.exists():
        print(f"Cogs directory not found: {COGS_DIR}", file=sys.stderr)
        sys.exit(1)

    categories = {}  # category name -> list of command dicts

    for path in sorted(COGS_DIR.glob("*.py")):
        if path.name.startswith("_"):
            continue
        for cog in parse_cog_file(path):
            for cmd in cog["commands"]:
                cat = cmd.pop("category")
                categories.setdefault(cat, {"name": cat, "icon": CATEGORY_ICON.get(cat.lower(), DEFAULT_ICON), "commands": []})
                categories[cat]["commands"].append(cmd)

    ordered = [categories[c] for c in sorted(categories.keys(), key=order_key)]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({"categories": ordered}, indent=2), encoding="utf-8")

    total_commands = sum(len(c["commands"]) for c in ordered)
    print(f"Wrote {OUTPUT_PATH} - {len(ordered)} categories, {total_commands} commands.")


if __name__ == "__main__":
    main()