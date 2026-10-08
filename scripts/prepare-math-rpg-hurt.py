"""Pack generated hurt poses without drawing, silhouette crops or per-frame scaling."""
from pathlib import Path
from hashlib import sha256
import json
from shutil import copyfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/world/art'
OUT = ROOT / 'assets/images/math-rpg/battle'
QA = ROOT / '.art-output/math-rpg-hurt'
MANIFEST = ART / 'manifests/ancient-legend-manifest.json'
CELL, ANCHOR, PADDING = 256, (128, 224), 16
DURATIONS = [80, 140, 160, 140]
# Measured empty separators of the COMPLETE generated sources, declared before packing.
# Entire rectangles are translated, including every nonzero alpha pixel. No masking.
SPECS = {
    'liwei': {'xs': [0, 627, 1254], 'roots': [346, 319], 'feet': [594, 562], 'scale': .27},
    'heen': {'xs': [0, 680, 1254], 'roots': [374, 300], 'feet': [612, 557], 'scale': .25},
}
FX = ('liwei-sword-sweep-v3', 'heen-magic-bolt-v1', 'hit-shards-v1')


def main():
    QA.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    report = {}
    for who, spec in SPECS.items():
        name = f'{who}-hurt'
        relative = f'docs/world/art/characters/{who}/{who}-hurt-source-v1.png'
        source = Image.open(ROOT / relative).convert('RGBA')
        assert source.size == (1254, 1254)
        # Generated transparency contains an exact RGBA (0,0,0,1) flat-background
        # residual. Remove that identified background sample only, never a broad
        # alpha threshold; retain colored faint edges and every opaque outline.
        pixels=bytearray(source.tobytes())
        matte_count=0
        for j in range(0,len(pixels),4):
            if pixels[j:j+4]==b'\x00\x00\x00\x01':
                pixels[j+3]=0
                matte_count+=1
        source=Image.frombytes('RGBA',source.size,bytes(pixels))
        frames = []
        bounds = []
        source_bounds = []
        atlas = Image.new('RGBA', (CELL*2, CELL*2))
        data = {'frames': {}, 'animations': {'play': []}, 'meta': {
            'image': f'{name}.webp', 'size': {'w':512, 'h':512}, 'scale':'1',
            'anchor': {'x':.5,'y':224/256}, 'frameDurationsMs':DURATIONS,
            'loop':False, 'padding':PADDING}}
        for i in range(4):
            col, row = i%2, i//2
            original = source.crop((spec['xs'][col], row*627, spec['xs'][col+1], (row+1)*627))
            original_bounds = original.getchannel('A').getbbox()
            assert original_bounds and min(original_bounds[0], original_bounds[1], original.width-original_bounds[2], original.height-original_bounds[3]) > 0, (name,i,original_bounds)
            source_bounds.append(original_bounds)
            scale = spec['scale']
            resized = original.resize((round(original.width*scale), round(original.height*scale)), Image.Resampling.NEAREST)
            offset = (ANCHOR[0]-round(spec['roots'][col]*scale), ANCHOR[1]-round(spec['feet'][row]*scale))
            assert min(offset)>=0 and offset[0]+resized.width<=CELL and offset[1]+resized.height<=CELL
            frame = Image.new('RGBA', (CELL,CELL))
            frame.paste(resized, offset)
            bbox = frame.getchannel('A').getbbox()
            assert bbox and min(bbox[0],bbox[1],CELL-bbox[2],CELL-bbox[3])>=PADDING, (name,i,bbox)
            bounds.append(bbox)
            frames.append(frame)
            frame.save(QA/f'{name}-{i+1:02}.png')
            atlas.paste(frame,(col*CELL,row*CELL))
            key=f'{name}-{i+1:02}'
            data['animations']['play'].append(key)
            data['frames'][key]={'frame':{'x':col*CELL,'y':row*CELL,'w':CELL,'h':CELL},
                'rotated':False,'trimmed':False,'sourceSize':{'w':CELL,'h':CELL},
                'spriteSourceSize':{'x':0,'y':0,'w':CELL,'h':CELL},'anchor':data['meta']['anchor'],'duration':DURATIONS[i]}
        atlas.save(OUT/f'{name}.webp','WEBP',lossless=True,exact=True,method=6)
        assert Image.open(OUT/f'{name}.webp').convert('RGBA').tobytes()==atlas.tobytes()
        (OUT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        contact=Image.new('RGB',(1024,1024),(24,34,52))
        for i,frame in enumerate(frames):
            contact.paste(frame.resize((512,512),Image.Resampling.NEAREST),(i%2*512,i//2*512),frame.resize((512,512),Image.Resampling.NEAREST))
        contact.save(QA/f'{name}-contact.png')
        light=Image.new('RGB',(512,512),(239,231,213))
        light.paste(atlas,(0,0),atlas)
        light.save(QA/f'{name}-light.png')
        sequence=[Image.alpha_composite(Image.new('RGBA',(CELL,CELL),(24,34,52,255)),f).convert('RGB') for f in frames]
        sequence[0].save(QA/f'{name}.gif',save_all=True,append_images=sequence[1:],duration=DURATIONS,loop=0,disposal=2)
        old=next((asset for asset in manifest['assets'] if asset['file']==relative),None)
        prompt=old['prompt'] if old else json.loads((QA/f'{who}-prompt.json').read_text(encoding='utf-8'))['prompt']
        entry={'file':relative,'tool':'built-in image_gen','sha256':sha256((ROOT/relative).read_bytes()).hexdigest(),
            'generation_basename':{'liwei':'exec-a6bfad88-d9e1-4fa8-99c1-e64568d37305.png','heen':'exec-55a89924-a8a5-4d9f-bfe1-4c9a1d815531.png'}[who],
            'prompt':prompt,
            'inputs':[f'assets/images/math-rpg/battle/{who}-idle.json'],
            'image':{'width':1254,'height':1254,'mode':'RGBA','grid':[2,2],'frame_count':4},
            'processing':{'script':'scripts/prepare-math-rpg-hurt.py','frame_size':[CELL,CELL],'anchor':list(ANCHOR),'padding':PADDING,
                'source_grid':spec,'source_bounds':source_bounds,'bounds':bounds,'durations_ms':DURATIONS,
                'method':'只移除生成背景精確 RGBA(0,0,0,1) 殘樣；保留有色低 alpha 邊緣。完整矩形共同比例 nearest 縮小、欄支點與行基線對齊，不逐幀裁輪廓、縮放或重畫',
                'identified_background_rgba':[0,0,0,1],'background_samples_removed':matte_count,
                'runtime':f'assets/images/math-rpg/battle/{name}.json','lossless_webp_exact_rgba':True}}
        if old: old.update(entry)
        else: manifest['assets'].append(entry)
        report[name]=entry['processing']
    for name in FX:
        original=ART/f'math-rpg/effects/{name}.json'
        data=json.loads(original.read_text(encoding='utf-8'))
        data['meta']['status']='adopted; exported to game runtime'
        original.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        for ext in ('webp','json'):
            copyfile(ART/f'math-rpg/effects/{name}.{ext}',OUT/f'{name}.{ext}')
        path=OUT/f'{name}.json'
        data=json.loads(path.read_text(encoding='utf-8'))
        data['meta']['status']='runtime; user requested integration'
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest['effect_candidates'].update(approved=True,runtime_integration=True,
        runtime_files=[f'assets/images/math-rpg/battle/{name}.json' for name in FX],
        note='已依使用者要求接入 Pixi；赫恩凝聚魔力彈僅定義視覺，不新增能力規則。黎薇劍氣加大並疊加同圖集短暫殘光。')
    manifest['production_sprite_contract']['inspection'][-1]='雙方受擊採獨立四幀 hurt 圖集，於劍氣／魔力彈命中時開始；第一至第四關維持暫代怪，勝敗正式動作未製作。'
    manifest['production_sprite_contract']['hurt_grid']=[2,2]
    manifest['production_sprite_contract']['effects'].update(grid=[3,2],minimum_safe_padding=16)
    for name in ('sword-sweep','hit-spark'):
        manifest['production_sprite_contract']['source_profiles'][name]['status']='historical export; no longer loaded by battle-art.ts'
    manifest['hurt_runtime']={'script':'scripts/prepare-math-rpg-hurt.py','clips':report,'clock':'battle elapsed; hero hit 620ms / king hit 700ms; reduced motion uses fixed poses'}
    legacy=('sword-sweep','hit-spark')
    manifest['runtime_assets']=[file for file in manifest['runtime_assets'] if not any(file.endswith(f'/{name}.{ext}') for name in legacy for ext in ('json','webp'))]
    for name in (*FX,'liwei-hurt','heen-hurt'):
        for ext in ('json','webp'):
            file=f'assets/images/math-rpg/battle/{name}.{ext}'
            if file not in manifest['runtime_assets']: manifest['runtime_assets'].append(file)
    manifest['runtime_integration']='Pixi 封面 Mesh 微動；五關答題原型使用像素 AnimatedSprite，第五關有四幀待機、六幀攻擊與四幀受擊；獨立圖集呈現黎薇朝右劍氣、赫恩朝左凝聚魔力彈及命中碎光，前四關維持暫代怪。'
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (QA/'packing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({name:entry['bounds'] for name,entry in report.items()}))


if __name__=='__main__':
    main()
