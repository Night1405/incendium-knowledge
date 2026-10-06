"""Rebuilds Incendium Respond's icon font: only the Material Symbols Sharp icons
the app uses, bundled in the resource so the app needs no internet for icons.

    python Originals/Phone/dev/icons.py            # after adding an icon('name') to app.js
    python Originals/Phone/dev/icons.py --check    # lists the icons, downloads nothing

Material Symbols are Apache License 2.0 (Google). Needs internet once, to fetch
the subset from Google Fonts.
"""
import os
import re
import sys
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
APP = os.path.join(ROOT, 'DevelopmentResources', 'incendium_phone', 'apps', 'respond')
OUT = os.path.join(APP, 'fonts', 'MaterialSymbolsSharp-subset.woff2')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def icons():
    with open(os.path.join(APP, 'app.js'), encoding='utf-8') as f:
        s = f.read()
    names = set(re.findall(r"icon\('([a-z_]+)'", s))
    names |= set(re.findall(r'<span class="ms[^"]*"[^>]*>([a-z_]+)</span>', s))
    names |= set(re.findall(r"icon: '([a-z_]+)'", s))
    names |= set(re.findall(r"\['[A-Za-z]+', '[a-z]+', '([a-z_]+)'\]", s))   # knowledge base callouts
    return sorted(names)


def main():
    names = icons()
    print(f'{len(names)} icons: {", ".join(names)}')
    if '--check' in sys.argv:
        return
    css_url = ('https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,400,0..1,0'
               f'&icon_names={",".join(names)}&display=block')
    css = urllib.request.urlopen(urllib.request.Request(css_url, headers={'User-Agent': UA})).read().decode()
    font = re.search(r'url\((https://fonts\.gstatic\.com[^)]+)\)', css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(font, headers={'User-Agent': UA})).read()
    with open(OUT, 'wb') as f:
        f.write(data)
    print(f'wrote {os.path.relpath(OUT, ROOT)} ({len(data)} bytes)')


if __name__ == '__main__':
    main()
