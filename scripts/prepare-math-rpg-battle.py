"""Pack authored full source rectangles into equal cells; never auto-crop silhouettes."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images/math-rpg/battle'
PREVIEW = ROOT / '.art-output/math-rpg-battle'
# Generated pose drafts have different row baselines. These manually reviewed layout
# profiles move WHOLE rectangles at one scale per action, not individual bounds.
SPECS = {
    'liwei-idle': ('characters/liwei/liwei-pixel-idle-source-v1.png', [0,627,1254], 627, [326,285], [599,548], .25, 256, [230,230,230,230]),
    'liwei-attack': ('characters/liwei/liwei-pixel-attack-source-v1.png', [0,512,1024,1536], 512, [256]*3, [503,467], .36, 256, [130,120,80,110,130,140]),
    'heen-idle': ('characters/heen/heen-pixel-idle-source-v1.png', [0,627,1254], 627, [320]*2, [588,563], .25, 256, [230]*4),
    'heen-attack': ('characters/heen/heen-pixel-attack-source-v1.png', [0,576,1024,1536], 512, [256,192,256], [497,471], .32, 256, [130,120,80,110,130,140]),
    'sword-sweep': ('math-rpg/sword-sweep-source-v1.png', [0,627,1254], 627, [313]*2, [313]*2, .16, 128, [65,75,90,100]),
    'hit-spark': ('math-rpg/hit-spark-source-v2.png', [0,627,1254], 627, [313]*2, [313]*2, .16, 128, [65,75,90,100]),
}

def main():
    OUT.mkdir(parents=True, exist_ok=True); PREVIEW.mkdir(parents=True, exist_ok=True)
    report = {}
    for name,(file,xs,row_h,roots,feet,scale,cell,times) in SPECS.items():
        source = Image.open(ROOT/'docs/world/art'/file).convert('RGBA')
        assert source.size == (xs[-1],row_h*2), (name,source.size)
        columns = len(xs)-1; frames = []
        atlas = Image.new('RGBA',(columns*cell,2*cell))
        bounds = []
        for i in range(columns*2):
            col,row = i%columns,i//columns
            rect = (xs[col],row*row_h,xs[col+1],(row+1)*row_h)
            original = source.crop(rect)
            # The source partitions were authored in empty gaps, not at the guessed
            # 3x2 divider through Heen's extended cloak. Do not clip that cloak.
            a = original.getchannel('A').point(lambda v:255 if v>=16 else 0)
            box = a.getbbox(); assert box is not None
            assert box[0]>2 and box[1]>2 and box[2]<original.width-2 and box[3]<original.height-2, (name,i,'source clipping',box)
            resized = original.resize((round(original.width*scale),round(original.height*scale)),Image.Resampling.NEAREST)
            frame = Image.new('RGBA',(cell,cell))
            anchor = (cell//2,cell//2 if cell==128 else 224)
            offset = (anchor[0]-round(roots[col]*scale),anchor[1]-round(feet[row]*scale))
            assert offset[0]>=0 and offset[1]>=0
            assert offset[0]+resized.width<=cell and offset[1]+resized.height<=cell, (name,i,'rectangle exceeds cell')
            frame.paste(resized,offset)
            box = frame.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
            assert min(box[0],box[1],cell-box[2],cell-box[3])>=12, (name,i,'safe padding',box)
            bounds.append(box); frames.append(frame)
            frame.save(PREVIEW/f'{name}-{i+1:02}.png')
            atlas.paste(frame,(col*cell,row*cell))
        atlas.save(OUT/f'{name}.webp','WEBP',lossless=True,exact=True,method=6)
        assert Image.open(OUT/f'{name}.webp').convert('RGBA').tobytes()==atlas.tobytes()
        data = {'frames':{},'animations':{'play':[]},'meta':{'image':f'{name}.webp','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}}
        for i in range(len(frames)):
            key=f'{name}-{i+1:02}'
            data['frames'][key]={'frame':{'x':i%columns*cell,'y':i//columns*cell,'w':cell,'h':cell},'rotated':False,'trimmed':False,
                'sourceSize':{'w':cell,'h':cell},'spriteSourceSize':{'x':0,'y':0,'w':cell,'h':cell},'duration':times[i]}
            data['animations']['play'].append(key)
        (OUT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        atlas.resize((atlas.width*2,atlas.height*2),Image.Resampling.NEAREST).save(PREVIEW/f'{name}-contact.png')
        preview=[Image.alpha_composite(Image.new('RGBA',f.size,(24,34,52,255)),f).resize((cell*2,cell*2),Image.Resampling.NEAREST).convert('RGB') for f in frames]
        preview[0].save(PREVIEW/f'{name}.gif',save_all=True,append_images=preview[1:],duration=times,loop=0,disposal=2)
        report[name]={'source':file,'source_size':list(source.size),'x_boundaries':xs,'row_height':row_h,'source_root_x':roots,
            'source_baselines':feet,'uniform_scale':scale,'frame_size':[cell,cell],'columns':columns,'rows':2,'anchor':anchor,
            'padding':12,'bounds':bounds,'durations_ms':times,'runtime':f'assets/images/math-rpg/battle/{name}.json'}
    bg=Image.open(ROOT/'docs/world/art/math-rpg/battle-court-source-v1.png')
    bg.resize((640,360),Image.Resampling.NEAREST).save(OUT/'battle-court-v1.webp','WEBP',lossless=True,method=6)
    (PREVIEW/'packing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:value['bounds'] for key,value in report.items()}))

if __name__=='__main__':main()
