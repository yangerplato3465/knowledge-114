"""Build lightweight website artwork from the retained world masters (Pillow)."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/world/art/site'
OUTPUT = ROOT / 'assets/images/site'
OUTPUT.mkdir(parents=True, exist_ok=True)
report = []


def encode(image, name, size, quality=82):
    image = image.copy()
    image.thumbnail(size, Image.Resampling.LANCZOS)
    destination = OUTPUT / (name + '.webp')
    image.save(destination, 'WEBP', quality=quality, method=6)
    report.append({'file': destination.name, 'size': image.size, 'bytes': destination.stat().st_size})


for name in ['forest-arrival']:
    image = Image.open(SOURCE / (name + '-v3.png')).convert('RGB')
    assert image.size == (1536, 1024), (name, image.size)
    encode(image, name, (1536, 1024) if name == 'forest-arrival' else (900, 600))
    if name == 'forest-arrival':
        encode(image, name + '-small', (900, 600), 80)

sheet = Image.open(SOURCE / 'portal-objects-source-v2.png').convert('RGBA')
assert sheet.size == (1536, 1024), sheet.size
normalized = Image.new('RGBA', sheet.size)
for i, name in enumerate(['science', 'adventure', 'lantern', 'library', 'ledger', 'key']):
    x, y = i % 3 * 512, i // 3 * 512
    cell = sheet.crop((x, y, x + 512, y + 512))
    visible = cell.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
    assert visible and min(visible[:2]) >= 12 and max(visible[2:]) <= 500, (name, visible)
    # Keep each entire cell; one uniform scale adds a shared safe gutter, never trim silhouettes.
    master = Image.new('RGBA', (512, 512))
    master.alpha_composite(cell.resize((384, 384), Image.Resampling.LANCZOS), (64, 64))
    normalized.alpha_composite(master, (x, y))
    output = master.resize((256, 256), Image.Resampling.LANCZOS)
    encode(output, name, (256, 256), 88)
    alpha_bounds = output.getchannel('A').getbbox()
    assert alpha_bounds and min(alpha_bounds[:2]) >= 30 and max(alpha_bounds[2:]) <= 226, (name, alpha_bounds)
    report[-1]['sourceBoundsAlpha8'] = visible
normalized.save(SOURCE / 'portal-objects-v2.png')

# Reference the existing identity master; do not duplicate the character original.
milo = Image.open(ROOT / 'docs/world/art/characters/milo/apprentice-v2.png').convert('RGBA')
encode(milo, 'milo', (320, 320), 86)
(SOURCE / 'display-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(report)} website assets: {sum(item["bytes"] for item in report):,} bytes total')
