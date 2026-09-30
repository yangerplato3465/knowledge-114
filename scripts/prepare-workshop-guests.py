"""Fixed-grid extraction; preserve the complete cell, using one shared scale for all poses."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
assets = root / 'assets/images/magic-workshop'
manifest = json.loads((assets / 'guest-animation-manifest.json').read_text(encoding='utf-8'))
# Registration measured against the initial 410px previews: torso centre and planted foot.
# Translating a complete cell keeps the same camera scale and never crops to visible bounds.
registration = {
    'rabbit': [(275,446),(230,446),(223,448),(260,429),(254,430),(240,431)],
    'deer': [(263,440),(258,441),(242,441),(264,431),(252,428),(249,429)],
    'owl': [(260,436),(237,434),(248,435),(266,413),(250,420),(246,420)],
    'fox': [(239,444),(218,444),(230,444),(222,427),(260,428),(263,428)],
    'bear': [(265,433),(236,435),(232,433),(276,431),(266,428),(248,425)],
}
for guest in manifest['guests']:
    sheet = Image.open(assets / guest['source']).convert('RGBA')
    assert sheet.size == (1536, 1024), (guest['key'], sheet.size)
    for frame in range(6):
        x, y = (frame % 3) * 512, (frame // 3) * 512
        cell = sheet.crop((x, y, x + 512, y + 512))
        bounds = cell.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        assert bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 512 and bounds[3] < 512, (guest['key'], frame, bounds)
        output = Image.new('RGBA', (512, 512))
        anchor_x, anchor_y = registration[guest['key']][frame]
        offset = (round(256-(anchor_x-51)*.9), round(448-(anchor_y-51)*.9))
        output.paste(cell.resize((369, 369), Image.Resampling.LANCZOS), offset)
        output.save(assets / 'display' / f"guest-{guest['key']}-walk-v1-{frame}.webp", quality=90, method=4)
        final_bounds = output.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        assert final_bounds[0] >= 48 and final_bounds[1] >= 48 and final_bounds[2] <= 464 and final_bounds[3] <= 464
        print(guest['key'], frame, final_bounds)
