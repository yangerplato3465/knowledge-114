"""Validate generated front-gaze masters and encode the unchanged pixels for display."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
assets = root / 'assets/images/magic-workshop'
manifest = json.loads((assets / 'guest-gaze-manifest.json').read_text(encoding='utf-8'))
width, height = manifest['frameSize']
padding = manifest['safePadding']
assert manifest['grid'] == [1, 1]

for frame in manifest['frames']:
    source = assets / frame['source']
    image = Image.open(source).convert('RGBA')
    assert image.size == (width, height), (source, image.size)
    alpha = image.getchannel('A').point(lambda value: 255 if value >= 16 else 0)
    bounds = alpha.getbbox()
    assert bounds, source
    left, top, right, bottom = bounds
    assert left >= padding and top >= padding and right <= width-padding and bottom <= height-padding, (source, bounds)
    display = assets / 'display' / frame['display']
    image.save(display, quality=90, method=4)
    encoded = Image.open(display).convert('RGBA')
    assert encoded.size == image.size, display
    encoded_bounds = encoded.getchannel('A').point(lambda value: 255 if value >= 16 else 0).getbbox()
    assert encoded_bounds == bounds, (display, bounds, encoded_bounds)
    print(frame['key'], image.size, bounds, display.stat().st_size)
