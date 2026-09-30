"""Build the workshop-only rounded WOFF2; requires fonttools and brotli.
Source: https://github.com/justfont/open-huninn-font/blob/master/font/jf-openhuninn-1.1.ttf
Usage: python scripts/prepare-workshop-font.py path/to/jf-openhuninn-1.1.ttf
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
font = TTFont(sys.argv[1])
text = ''.join(path.read_text(encoding='utf-8-sig') for path in (root / 'src/games/magic-workshop').glob('*.ts*') if '.test.' not in path.name)
text += ''.join(chr(i) for i in range(32, 127)) + '★☆✦✧↶↻⌫—'
options = subset.Options()
options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
# A subset is a modified font. Avoid the upstream Reserved Font Names.
for record in font['name'].names:
    if record.nameID in (1, 3, 4, 6, 16):
        record.string = 'WorkshopRounded' if record.nameID == 6 else 'Workshop Rounded'
    elif record.nameID in (2, 17):
        record.string = 'Regular'
font.flavor = 'woff2'
output = root / 'assets/fonts/workshop/workshop-rounded.woff2'
font.save(output)
print(f'{output.name}: {output.stat().st_size} bytes')
