"""Checks the knowledge library before Incendium Respond loads it.

    python tools/check_library.py

Fails (exit code 1) when library.json is invalid, an article file is missing or
too big, ids repeat, a category is unknown, or an image link points at a file
that is not in the repository. Runs on every push (.github/workflows/check.yml).
"""
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MAX_ARTICLE_BYTES = 200_000
ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,63}$')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
IMAGE = re.compile(r'!\[[^\]]*\]\(([^)\s]+)\)')


def main():
    errors = []
    path = os.path.join(ROOT, 'library.json')
    try:
        with open(path, encoding='utf-8') as f:
            lib = json.load(f)
    except Exception as e:
        print(f'library.json could not be read: {e}')
        return 1

    categories = {}
    for c in lib.get('categories', []):
        if not ID.match(str(c.get('id', ''))):
            errors.append(f'category id {c.get("id")!r}: use lower-case letters, numbers and dashes')
        if not c.get('name'):
            errors.append(f'category {c.get("id")!r} has no name')
        categories[c.get('id')] = c

    seen = set()
    for a in lib.get('articles', []):
        aid = a.get('id', '')
        where = f'article {aid!r}'
        if not ID.match(str(aid)):
            errors.append(f'{where}: id must be lower-case letters, numbers and dashes')
        if aid in seen:
            errors.append(f'{where}: id used twice')
        seen.add(aid)
        if not a.get('title'):
            errors.append(f'{where}: no title')
        if a.get('category') not in categories:
            errors.append(f'{where}: category {a.get("category")!r} is not in "categories"')
        if not isinstance(a.get('tags', []), list):
            errors.append(f'{where}: tags must be a list')
        if a.get('updated') and not DATE.match(a['updated']):
            errors.append(f'{where}: updated must be YYYY-MM-DD')
        file = a.get('file', '')
        full = os.path.normpath(os.path.join(ROOT, file))
        if not file.endswith('.md') or not full.startswith(ROOT) or not os.path.isfile(full):
            errors.append(f'{where}: file {file!r} is missing')
            continue
        size = os.path.getsize(full)
        if size > MAX_ARTICLE_BYTES:
            errors.append(f'{where}: {file} is {size // 1000} KB (limit {MAX_ARTICLE_BYTES // 1000} KB)')
        with open(full, encoding='utf-8') as f:
            text = f.read()
        for link in IMAGE.findall(text):
            if link.startswith(('http://', 'https://')):
                continue
            img = os.path.normpath(os.path.join(os.path.dirname(full), link))
            if not os.path.isfile(img):
                errors.append(f'{where}: image {link} is not in the repository')

    for e in errors:
        print('ERROR', e)
    print(f'{len(lib.get("articles", []))} articles, {len(categories)} categories, {len(errors)} error(s)')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
