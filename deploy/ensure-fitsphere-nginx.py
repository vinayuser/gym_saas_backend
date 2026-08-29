#!/usr/bin/env python3
"""Ensure FitSphere /fitsphere/ locations are included in the medisewa nginx site.

Medisewa deploys rewrite /etc/nginx/sites-available/medisewa and drop this include.
Run after every gym-saas backend deploy (and after medisewa nginx overwrites).
"""
from pathlib import Path

PATH = Path('/etc/nginx/sites-available/medisewa')
SNIPPET = '/etc/nginx/snippets/gym-saas-fitsphere.conf'


def main() -> None:
    if not PATH.exists():
        raise SystemExit(f'missing {PATH}')

    text = PATH.read_text()
    cleaned = []
    for line in text.splitlines(True):
        s = line.lstrip()
        if s.startswith('n    # FitSphere') or s.strip() == 'n':
            continue
        if f'include {SNIPPET}' in line:
            continue
        if s.startswith('# FitSphere Gym SaaS'):
            continue
        cleaned.append(line)
    text = ''.join(cleaned)

    needle = '    client_max_body_size 25m;\n'
    insert = (
        '    client_max_body_size 25m;\n\n'
        '    # FitSphere Gym SaaS\n'
        f'    include {SNIPPET};\n'
    )
    if needle not in text:
        raise SystemExit('could not locate client_max_body_size in medisewa site')

    text = text.replace(needle, insert, 1)
    PATH.write_text(text)
    print('fitsphere nginx include ensured')


if __name__ == '__main__':
    main()
