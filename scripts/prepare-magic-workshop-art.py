"""Encode complete, untrimmed display copies. Requires Pillow; originals are retained."""
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/images/magic-workshop'
FILES = sorted(set(re.findall(r"file: '([^']+)'", (ROOT / 'src/games/magic-workshop/art.ts').read_text(encoding='utf-8')))
               | {'bottle-magic-ring-v1.png', 'workshop-panorama-v1.png'})
out = ASSETS / 'display'
out.mkdir(exist_ok=True)
entries = []
for name in FILES:
    with Image.open(ASSETS / name) as source:
        image = source.convert('RGBA')
        original_size = image.size
        # Whole canvas scales together: no crop, no per-pose trimming, no alpha edits.
        image.thumbnail((1536, 1536) if name.startswith('workshop-') else (768, 768), Image.Resampling.LANCZOS)
        target = out / Path(name).with_suffix('.webp')
        image.save(target, 'WEBP', quality=90, method=6)
        with Image.open(target) as decoded:
            assert decoded.size == image.size
            alpha = decoded.convert('RGBA').getchannel('A')
            visible = alpha.point(lambda a: 255 if a >= 16 else 0).getbbox()
        entries.append({'source': name, 'file': target.name, 'sourceSize': original_size,
                        'size': image.size, 'visibleBoundsAlpha16': visible,
                        'sourceBytes': (ASSETS / name).stat().st_size, 'bytes': target.stat().st_size})
(out / 'manifest.json').write_text(json.dumps({'processing': 'Full canvas resized uniformly; no crop or alpha cleanup.', 'assets': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(entries)} assets: {sum(e["sourceBytes"] for e in entries)} -> {sum(e["bytes"] for e in entries)} bytes')
