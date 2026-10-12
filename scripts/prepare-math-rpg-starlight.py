"""Validate and export Liwei's six-frame starlight sword sweep."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/world/art/math-rpg/liwei-sword-sweep-source-v3.png'
ART = ROOT / 'docs/world/art/math-rpg/effects'
RUNTIME = ROOT / 'assets/images/math-rpg/battle'
NAME = 'liwei-sword-sweep-v4'
SOURCE_CELL = 512
CELL = 128
SCALED = 112
PADDING = 16
DURATIONS = (60, 70, 80, 70, 80, 100)


def bounds(frame, padding, label):
    box = frame.getchannel('A').getbbox()
    assert box is not None, f'{label}: empty frame'
    actual = min(box[0], box[1], frame.width-box[2], frame.height-box[3])
    assert actual >= padding, f'{label}: padding {actual} < {padding}, bounds {box}'
    return list(box), actual


def main():
    source = Image.open(SOURCE).convert('RGBA')
    assert source.size == (3*SOURCE_CELL, 2*SOURCE_CELL), source.size
    atlas = Image.new('RGBA', (3*CELL, 2*CELL))
    contact = Image.new('RGB', (6*CELL, 4*CELL), (24, 34, 52))
    frames = []
    report = []
    for index in range(6):
        col, row = index % 3, index // 3
        original = source.crop((col*SOURCE_CELL, row*SOURCE_CELL,
                                (col+1)*SOURCE_CELL, (row+1)*SOURCE_CELL))
        source_box, source_padding = bounds(original, 64, f'source {index+1}')
        # One whole-cell scale and center for every frame; no contour crop.
        scaled = original.resize((SCALED, SCALED), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (CELL, CELL))
        frame.paste(ImageOps.mirror(scaled), ((CELL-SCALED)//2, (CELL-SCALED)//2))
        export_box, export_padding = bounds(frame, PADDING, f'export {index+1}')
        assert frame.getchannel('A').getextrema()[0] == 0
        atlas.paste(frame, (col*CELL, row*CELL))
        frames.append(frame)
        enlarged = frame.resize((2*CELL, 2*CELL), Image.Resampling.NEAREST)
        contact.paste(enlarged, (col*2*CELL, row*2*CELL), enlarged)
        report.append({'source_bounds': source_box, 'source_padding': source_padding,
                       'export_bounds': export_box, 'export_padding': export_padding})

    ART.mkdir(parents=True, exist_ok=True)
    atlas.save(ART / f'{NAME}.png')
    atlas.save(ART / f'{NAME}.webp', 'WEBP', lossless=True, exact=True, method=6)
    assert Image.open(ART / f'{NAME}.webp').convert('RGBA').tobytes() == atlas.tobytes()
    contact.save(ART / f'{NAME}-contact.png')
    preview = [Image.alpha_composite(Image.new('RGBA', (CELL, CELL), (24, 34, 52, 255)),
                                     frame).convert('RGB') for frame in frames]
    preview[0].save(ART / f'{NAME}.gif', save_all=True, append_images=preview[1:],
                    duration=DURATIONS, loop=0, disposal=2)

    data = {'frames': {}, 'animations': {'play': []}, 'meta': {
        'image': f'{NAME}.webp', 'size': {'w': atlas.width, 'h': atlas.height},
        'scale': '1', 'anchor': {'x': .5, 'y': .5},
        'frameDurationsMs': list(DURATIONS), 'loop': False,
        'status': 'runtime; starlight sword sweep', 'padding': PADDING}}
    for index in range(6):
        key = f'{NAME}-{index+1:02}'
        data['frames'][key] = {
            'frame': {'x': index%3*CELL, 'y': index//3*CELL, 'w': CELL, 'h': CELL},
            'rotated': False, 'trimmed': False, 'anchor': {'x': .5, 'y': .5},
            'sourceSize': {'w': CELL, 'h': CELL},
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL, 'h': CELL},
            'duration': DURATIONS[index]}
        data['animations']['play'].append(key)
    encoded = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    (ART / f'{NAME}.json').write_text(encoded, encoding='utf-8')
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / f'{NAME}.json').write_text(encoded, encoding='utf-8')
    (RUNTIME / f'{NAME}.webp').write_bytes((ART / f'{NAME}.webp').read_bytes())
    print(json.dumps({'source_sha256': sha256(SOURCE.read_bytes()).hexdigest(),
                      'frames': report}, ensure_ascii=False))


if __name__ == '__main__':
    main()
