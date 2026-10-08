"""Export reviewed FX candidates. Never redraw effects or replace active game art."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/world/art'
OUT = ART / 'math-rpg/effects'
QA = ROOT / '.art-output/math-rpg-fx'
MANIFEST = ART / 'manifests/ancient-legend-manifest.json'
CELL = 128
SOURCE_CELL = 512
SCALED_CELL = 112
PADDING = 16
KEY = (255, 0, 255)
KEY_TOLERANCE = 64
SPECS = {
    'liwei-sword-sweep-v3': ('liwei-sword-sweep-source-v2.png', [60,70,80,70,80,100], True, '黎薇・劍氣前緣朝右 →'),
    'heen-magic-bolt-v1': ('heen-magic-bolt-source-v1.png', [100,100,100,100,90,100], False, '← 赫恩・凝聚魔力彈'),
    'hit-shards-v1': ('hit-shards-source-v1.png', [50,65,80,85,100,120], False, '共用・命中碎光'),
}


def keyed_rgba(image, protect_violet):
    """Remove only the specified absent-from-foreground key; no bounds-based masking."""
    image = image.convert('RGBA')
    rgba = bytearray(image.tobytes())
    for i in range(0, len(rgba), 4):
        r, g, b = rgba[i:i+3]
        # The source key blends into a few hard pixel edges. Its magenta hue is
        # absent from sword/impact palettes; preserve the actual violet cast art.
        chroma_limit = 120 if protect_violet else 40
        magenta_spill = r-g > chroma_limit and b-g > chroma_limit
        if max(abs(rgba[i + c] - KEY[c]) for c in range(3)) <= KEY_TOLERANCE or magenta_spill:
            rgba[i:i+4] = b'\x00\x00\x00\x00'
    return Image.frombytes('RGBA', image.size, bytes(rgba))


def checked_bounds(image, padding, label):
    # All nonzero alpha counts, including motes and edges. No threshold can hide clipping.
    bounds = image.getchannel('A').getbbox()
    assert bounds, (label, 'empty frame')
    actual = min(bounds[0], bounds[1], image.width-bounds[2], image.height-bounds[3])
    assert actual >= padding, (label, 'insufficient full-alpha padding', bounds, actual)
    return list(bounds), actual


def chinese_font(size):
    path = Path('C:/Windows/Fonts/msjh.ttc')
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def board(frames, background, scale=2):
    image = Image.new('RGB', (3*CELL, 2*CELL), background)
    for i, frame in enumerate(frames):
        image.paste(frame, (i%3*CELL, i//3*CELL), frame)
    return image.resize((image.width*scale, image.height*scale), Image.Resampling.NEAREST)


def sample(frames, durations, elapsed):
    if elapsed < 0 or elapsed >= sum(durations):
        return None
    for frame, duration in zip(frames, durations):
        if elapsed < duration:
            return frame
        elapsed -= duration
    return None


def load_actor(name, stretch=1.6):
    # Read the ACTIVE atlas, never regenerate the already confirmed characters.
    folder = ROOT / 'assets/images/math-rpg/battle'
    data = json.loads((folder / f'{name}.json').read_text(encoding='utf-8'))
    atlas = Image.open(folder / data['meta']['image']).convert('RGBA')
    frames = []
    durations = []
    for key in data['animations']['play']:
        entry = data['frames'][key]
        rect = entry['frame']
        frames.append(atlas.crop((rect['x'], rect['y'], rect['x']+rect['w'], rect['y']+rect['h'])))
        durations.append(round(entry['duration']*stretch))
    return frames, durations


def battle_preview(all_frames):
    background = Image.open(ROOT / 'assets/images/math-rpg/battle/battle-court-v1.webp').convert('RGBA')
    liwei_idle, _ = load_actor('liwei-idle')
    heen_idle, _ = load_actor('heen-idle')
    liwei_attack, liwei_times = load_actor('liwei-attack')
    heen_attack, heen_times = load_actor('heen-attack')
    adopted=(ROOT/'assets/images/math-rpg/battle/liwei-hurt.json').exists()
    if adopted:
        liwei_hurt, liwei_hurt_times=load_actor('liwei-hurt',1)
        heen_hurt, heen_hurt_times=load_actor('heen-hurt',1)
    animation = []
    peaks = []
    font = chinese_font(17)
    for attacker in ('liwei', 'heen'):
        for elapsed in range(-250, 1350, 50):
            frame = background.copy()
            liwei = sample(liwei_attack, liwei_times, elapsed) if attacker == 'liwei' else None
            heen = sample(heen_attack, heen_times, elapsed) if attacker == 'heen' else None
            if adopted:
                if attacker=='heen': liwei=sample(liwei_hurt,liwei_hurt_times,elapsed-700)
                else: heen=sample(heen_hurt,heen_hurt_times,elapsed-620)
            frame.alpha_composite(liwei if liwei is not None else liwei_idle[0], (42,-6))
            frame.alpha_composite(heen if heen is not None else heen_idle[0], (342,-6))
            name = 'liwei-sword-sweep-v3' if attacker == 'liwei' else 'heen-magic-bolt-v1'
            # Gather at the hand, compress as it rises, then travel left at release.
            effect = sample(all_frames[name], SPECS[name][1], elapsed-(340 if attacker == 'liwei' else 300))
            y = 140
            if attacker == 'liwei':
                flight = max(0, min(1, (elapsed-340)/280))
                x = round(220+230*flight)
            elif elapsed < 500:
                lift = max(0, min(1, (elapsed-300)/120))
                x = round(442-22*lift)
                y = round(156-50*lift)
            else:
                flight = max(0, min(1, (elapsed-500)/200))
                x = round(420-238*flight)
                y = round(106+34*flight)
            if effect is not None:
                if adopted and attacker=='liwei':
                    lag=elapsed-80
                    echo=sample(all_frames[name],SPECS[name][1],lag-340)
                    if echo is not None:
                        echo=echo.resize((173,173),Image.Resampling.NEAREST)
                        echo.putalpha(echo.getchannel('A').point(lambda a:round(a*.28)))
                        ex=round(220+230*max(0,min(1,(lag-340)/280)))
                        frame.alpha_composite(echo,(ex-86,y-82))
                    effect=effect.resize((192,192),Image.Resampling.NEAREST)
                    frame.alpha_composite(effect,(x-96,y-96))
                else: frame.alpha_composite(effect, (x-64, y-64))
            hit = sample(all_frames['hit-shards-v1'], SPECS['hit-shards-v1'][1], elapsed-(620 if attacker == 'liwei' else 700))
            if hit is not None:
                target = 462 if attacker == 'liwei' else 180
                frame.alpha_composite(hit, (target-64, 140-64))
            # Annotation belongs to this REVIEW preview, not the game's UI.
            draw = ImageDraw.Draw(frame)
            label = '黎薇・劍氣朝右 →' if attacker == 'liwei' else '← 赫恩・凝聚魔力彈'
            draw.text((18,18), label, font=font, fill=(239,230,208), stroke_width=2, stroke_fill=(24,28,39))
            draw.text((18,330), '現役圖集｜攻擊、命中、受擊同步' if adopted else '美術候選｜角色取自現有遊戲圖集', font=chinese_font(13), fill=(239,230,208))
            animation.append(frame.convert('RGB'))
            if elapsed in ((500,750) if attacker == 'liwei' else (650,850)):
                peaks.append(frame.convert('RGB'))
    # One global palette avoids palette changes between individual GIF frames.
    palette_board = Image.new('RGB', (640, 360*5+256*len(SPECS)), (24,34,52))
    palette_board.paste(background.convert('RGB'), (0,0))
    for i, frame in enumerate(peaks):
        palette_board.paste(frame, (0,360*(i+1)))
    for i, name in enumerate(SPECS):
        for j, effect in enumerate(all_frames[name]):
            palette_board.paste(effect, ((j%3)*128, 360*5+i*256+(j//3)*128), effect)
    palette = palette_board.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    gifs = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in animation]
    preview='battle-hurt-preview-v1' if adopted else 'effects-battle-preview-v2'
    gifs[0].save(OUT/f'{preview}.gif', save_all=True, append_images=gifs[1:], duration=50, loop=0, disposal=2)
    contact = Image.new('RGB', (1280,720))
    for i, frame in enumerate(peaks):
        # Columns are actors; rows are maximum slash and maximum contact.
        contact.paste(frame, (640*(i//2),360*(i%2)))
    contact.save(OUT/f'{preview}.png')
    for i, frame in enumerate(animation):
        frame.save(QA/f'battle-preview-{i:02}.png')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    integration=manifest.get('effect_candidates',{})
    adopted=integration.get('runtime_integration',False)
    report = {}
    all_frames = {}
    for name, (file, durations, mirror, label) in SPECS.items():
        relative = f'docs/world/art/math-rpg/{file}'
        source = Image.open(ROOT / relative).convert('RGBA')
        assert source.size == (1536,1024), (name, source.size, 'unexpected source grid')
        # Mirroring controls direction only; the violet palette needs separate
        # protection from key-color removal even when it is not mirrored.
        violet = name.startswith('heen-')
        clean = keyed_rgba(source, violet)
        atlas = Image.new('RGBA', (3*CELL,2*CELL))
        frames = []
        source_bounds = []
        bounds = []
        padding = []
        for i in range(6):
            col, row = i%3, i//3
            original = clean.crop((col*SOURCE_CELL,row*SOURCE_CELL,(col+1)*SOURCE_CELL,(row+1)*SOURCE_CELL))
            source_bounds.append(checked_bounds(original, 2, f'{name} source {i+1}')[0])
            # ONE shared scale and center for ALL 18 frames; full source cells only.
            resized = original.resize((SCALED_CELL,SCALED_CELL), Image.Resampling.NEAREST)
            if mirror:
                resized = ImageOps.mirror(resized)
            frame = Image.new('RGBA', (CELL,CELL))
            offset = (CELL-SCALED_CELL)//2
            frame.paste(resized, (offset,offset))
            bbox, actual = checked_bounds(frame, PADDING, f'{name} export {i+1}')
            bounds.append(bbox)
            padding.append(actual)
            frames.append(frame)
            frame.save(QA/f'{name}-{i+1:02}.png')
            atlas.paste(frame, (col*CELL,row*CELL))
        atlas.save(OUT/f'{name}.png')
        atlas.save(OUT/f'{name}.webp', 'WEBP', lossless=True, exact=True, method=6)
        assert Image.open(OUT/f'{name}.webp').convert('RGBA').tobytes() == atlas.tobytes()
        data = {'frames':{}, 'animations':{'play':[]}, 'meta':{
            'image':f'{name}.webp', 'size':{'w':atlas.width,'h':atlas.height}, 'scale':'1',
            'anchor':{'x':.5,'y':.5}, 'frameDurationsMs':durations, 'loop':False,
            'status':'adopted; exported to game runtime' if adopted else 'review-candidate; not loaded by the game', 'padding':PADDING}}
        for i in range(6):
            key = f'{name}-{i+1:02}'
            data['frames'][key] = {'frame':{'x':i%3*CELL,'y':i//3*CELL,'w':CELL,'h':CELL},
                'rotated':False, 'trimmed':False, 'anchor':{'x':.5,'y':.5}, 'sourceSize':{'w':CELL,'h':CELL},
                'spriteSourceSize':{'x':0,'y':0,'w':CELL,'h':CELL}, 'duration':durations[i]}
            data['animations']['play'].append(key)
        (OUT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        board(frames, (24,34,52)).save(QA/f'{name}-dark-contact.png')
        board(frames, (234,225,207)).save(QA/f'{name}-light-contact.png')
        sequence = [Image.alpha_composite(Image.new('RGBA',(CELL,CELL),(24,34,52,255)), f).convert('RGB') for f in frames]
        sequence[0].save(OUT/f'{name}.gif', save_all=True, append_images=sequence[1:], duration=durations, loop=0, disposal=2)
        report[name] = {'source':relative, 'source_size':list(source.size), 'source_bounds':source_bounds,
            'sha256':sha256((ROOT/relative).read_bytes()).hexdigest(),
            'frame_size':[CELL,CELL], 'grid':[3,2], 'frame_count':6, 'anchor':[64,64],
            'uniform_full_cell_scale':SCALED_CELL/SOURCE_CELL, 'center_offset':[offset,offset],
            'horizontal_mirror_all_frames':mirror, 'bounds':bounds, 'actual_padding':padding,
            'durations_ms':durations, 'alpha_extrema':list(atlas.getchannel('A').getextrema()),
            'lossless_webp_exact_rgba':True, 'production_ready':False,
            'status':'已採用；現役引用見 battle-art.ts' if adopted else '美術候選；未替換現役特效，正式 Pixi 播放待確認後驗證',
            'outputs':[f'docs/world/art/math-rpg/effects/{name}.{ext}' for ext in ('png','webp','json','gif')]}
        entry = next(asset for asset in manifest['assets'] if asset['file'] == relative)
        entry['image'] = {'width':source.width,'height':source.height,'mode':'RGBA','frame_count':6,'grid':[3,2],
            'source_background':'flat magenta key; not a transparent sprite yet'}
        entry['processing'] = {'script':'scripts/prepare-math-rpg-effects.py', 'method':'色鍵移除背景；整格共同比例縮小與置中；不裁輪廓、不逐幀縮放或重畫',
            'key_rgb':list(KEY),'key_max_channel_distance':KEY_TOLERANCE,
            'magenta_spill_min_r_minus_g_and_b_minus_g':120 if violet else 40, **report[name]}
        if name == 'liwei-sword-sweep-v3':
            entry['processing']['orientation'] = '全部六幀水平翻轉；圓弧凸出的前緣朝右、凹口朝左，飛向赫恩；保留原色、尺寸與時序'
            entry['processing']['superseded_export'] = 'docs/world/art/math-rpg/effects/liwei-sword-sweep-v2.json'
        all_frames[name] = frames
    battle_preview(all_frames)
    contact = Image.new('RGB', (3*CELL*2, (2*CELL*2+48)*3), (24,34,52))
    draw = ImageDraw.Draw(contact)
    for i, (name, spec) in enumerate(SPECS.items()):
        y = i*(2*CELL*2+48)
        draw.text((16,y+10), spec[3], font=chinese_font(23), fill=(239,230,208))
        contact.paste(board(all_frames[name],(24,34,52)), (0,y+48))
    contact.save(OUT/'effects-contact-v2.png')
    rejected = next(asset for asset in manifest['assets'] if asset['file'] == 'docs/world/art/math-rpg/heen-magic-wave-source-v1.png')
    rejected['status'] = '使用者指出輪廓像劍氣；未採用，改以凝聚魔力彈美術方向製作'
    rejected['processing']['status'] = rejected['status']
    for old, replacement, reason in (
        ('liwei-sword-sweep-v2','liwei-sword-sweep-v3','圓弧前緣朝向相反，修正版見 v3'),
        ('heen-magic-wave-v1','heen-magic-bolt-v1','使用者指出輪廓像劍氣，未採用')):
        path = OUT/f'{old}.json'
        if path.exists():
            legacy = json.loads(path.read_text(encoding='utf-8'))
            legacy['meta'].update(status='superseded; not loaded by the game',
                supersededBy=f'{replacement}.json', reviewComment=reason)
            path.write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest['effect_candidates'] = {
        **integration, 'approved':integration.get('approved',False), 'runtime_integration':adopted,
        'directory':'docs/world/art/math-rpg/effects', 'script':'scripts/prepare-math-rpg-effects.py',
        'contact':'docs/world/art/math-rpg/effects/effects-contact-v2.png',
        'battle_preview':f'docs/world/art/math-rpg/effects/{"battle-hurt-preview-v1" if adopted else "effects-battle-preview-v2"}.gif',
        'current_sword':'docs/world/art/math-rpg/effects/liwei-sword-sweep-v3.json',
        'current_magic':'docs/world/art/math-rpg/effects/heen-magic-bolt-v1.json',
        'selected_magic_visual_direction':'使用者選定：掌心聚攏、壓縮，再推出厚實的灰紫魔力彈；僅為攻擊外觀與動作，能力規則未定案',
        'superseded_derivatives':{
            'liwei-sword-sweep-v2':'圓弧前緣朝向相反，以 v3 修正；原圖不變',
            'heen-magic-wave-v1':'使用者指出輪廓像劍氣；未採用',
            'effects-battle-preview-v1':'含上述舊特效，改看 v2'},
        'preview_actors':'現役 battle/liwei-* 與 heen-* 圖集；沒有生成新人物',
        'note':integration['note'] if adopted else '特效不定義能力規則；角色、題庫、遊戲程式及現役載入檔未更換。所有非零 alpha 留白與 PNG/WebP 一致性已驗證；畫風、節奏與正式 Pixi 播放待確認。'}
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (QA/'packing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({name:{'bounds':v['bounds'],'padding':v['actual_padding']} for name,v in report.items()}))


if __name__ == '__main__':
    main()
