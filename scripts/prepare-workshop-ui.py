"""Extract entire fixed cells; downsample generated illustrations to runtime WebP sizes."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
assets=root/'assets/images/magic-workshop'
groups={
 'icons': [('book-beginner',128),('book-advanced',128),('book-master',128),('crystal-lit',128),('crystal-dim',128),('star',64)],
 'effects': [('mote',64),('bloom',128),('drop',64),('liquid',256),('surface',128),('hand',128)],
 'panels': [('parchment',512),('wood',256),('speech',512),('shadow',128),('halo',128),('door',96)],
}
specs={}; disk=0; pixels=0
for group, entries in groups.items():
 sheet=Image.open(assets/f'workshop-{group}-v1.png').convert('RGBA')
 assert sheet.size==(1536,1024)
 for i,(key,size) in enumerate(entries):
  x,y=i%3*512,i//3*512
  cell=sheet.crop((x,y,x+512,y+512))
  bounds=cell.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
  print(key,'source bounds',bounds)
  output=Image.new('RGBA',(size,size)); inner=round(size*.8); offset=(size-inner)//2
  output.paste(cell.resize((inner,inner),Image.Resampling.LANCZOS),(offset,offset))
  target=assets/'display'/f'ui-{key}.webp';output.save(target,quality=88,method=4)
  # Faint shadows/glows use a lower alpha threshold for placement bounds.
  bounds=output.getchannel('A').point(lambda v:255 if v>=8 else 0).getbbox()
  assert bounds, key
  specs[key]={'file':target.name,'bounds':[round(v/size,5) for v in bounds],'size':size}
  disk+=target.stat().st_size;pixels+=size*size
# Single-frame stream: preserve the complete master and add the same safe outer gutter.
stream=Image.open(assets/'water-stream-v2.png').convert('RGBA')
stream.thumbnail((210,210),Image.Resampling.LANCZOS)
output=Image.new('RGBA',(256,256))
output.alpha_composite(stream,((256-stream.width)//2,(256-stream.height)//2))
target=assets/'display'/'water-stream-v2.webp';output.save(target,quality=88,method=6)
bounds=output.getchannel('A').point(lambda v:255 if v>=8 else 0).getbbox()
assert bounds and min(bounds[:2])>=21 and max(bounds[2:])<=235
specs['stream']={'file':target.name,'bounds':[round(v/256,5) for v in bounds],'size':256}
disk+=target.stat().st_size;pixels+=256*256
(root/'src/games/magic-workshop/ui-art.ts').write_text('/** Generated illustration metadata; rebuild with scripts/prepare-workshop-ui.py. */\nimport { RUSTIC_ART } from "./rustic-art";\nexport const UI_ART = { ...RUSTIC_ART, ...'+json.dumps(specs,indent=2)+' } as const;\nexport type UiArtKey = keyof typeof UI_ART;\n',encoding='utf-8')
print(f'Runtime: {disk} bytes WebP, {pixels*4} bytes RGBA before GPU overhead; sources are not loaded.')
