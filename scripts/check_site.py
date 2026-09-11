"""Check local HTML/CSS/module references without downloading dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
checked = 0

def check(source, value):
    global checked
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path or '${' in value:
        return
    target = ROOT / unquote(url.path.lstrip('/')) if url.path.startswith('/') else source.parent / unquote(url.path)
    checked += 1
    if not target.exists():
        errors.append(f'{source.relative_to(ROOT)}: missing {value}')

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.ids = set()
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            if attrs['id'] in self.ids:
                errors.append(f'{self.source.relative_to(ROOT)}: duplicate id {attrs["id"]}')
            self.ids.add(attrs['id'])
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                check(self.source, attrs[key])
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(Path(attrs['src']).name)

pages = [ROOT/'index.html', *sorted((ROOT/'pages').glob('*.html'))]
for source in pages:
    page = Page(source)
    page.feed(source.read_text(encoding='utf-8'))
    for data, game in [('math-rpg-pools.js', 'math-rpg.js'), ('word-sort-pools.js', 'word-sort.js')]:
        if game in page.scripts and (data not in page.scripts or page.scripts.index(data) > page.scripts.index(game)):
            errors.append(f'{source.name}: {data} must load before {game}')
for source in (ROOT/'assets/css').glob('*.css'):
    for value in re.findall(r'url\(\s*[\'"]?([^\'"\)]+)', source.read_text(encoding='utf-8')):
        check(source, value.strip())
for source in (ROOT/'assets/js').rglob('*.js'):
    text = source.read_text(encoding='utf-8')
    for value in re.findall(r'(?:\bfrom\s*|\bimport\s*\(?\s*)[\'"](\.[^\'"\n]+)[\'"]', text):
        check(source, value)
config = json.loads((ROOT/'config.json').read_text(encoding='utf-8'))
assert re.fullmatch(r'\d+\.\d+\.\d+', config['version']), 'Invalid version'
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', config['lastUpdated']), 'Invalid date'
for error in errors:
    print(error)
print(f'{len(pages)} pages, {checked} local references, {len(errors)} errors')
sys.exit(bool(errors))
