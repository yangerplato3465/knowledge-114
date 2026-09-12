from html.parser import HTMLParser
from pathlib import Path
from PIL import Image
import json,re
class Node:
 def __init__(self,tag='',attrs=()): self.tag=tag; self.attrs=dict(attrs); self.children=[]
class Parser(HTMLParser):
 def __init__(self): super().__init__(); self.root=Node(); self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=Node(t,a); self.stack[-1].children.append(n)
  if t not in ['img','br','meta','link','input','hr']: self.stack.append(n)
 def handle_endtag(self,t):
  if self.stack[-1].tag==t:self.stack.pop()
 def handle_data(self,d): self.stack[-1].children.append(d)
p=Parser(); p.feed(Path('pages/magic-ink.html').read_text(encoding='utf-8'))
def walk(n):
 if isinstance(n,Node):
  yield n
  for c in n.children:yield from walk(c)
def text(n):return n if isinstance(n,str) else ''.join(text(c) for c in n.children)
def cls(n,c):return c in n.attrs.get('class','').split()
def child(n,c):return next(x for x in walk(n) if cls(x,c))
def js(v):return json.dumps(v,ensure_ascii=False)
allnodes=list(walk(p.root)); quizzes=[n for n in allnodes if cls(n,'quiz')]
quizdata=[]
for i,n in enumerate(quizzes):
 quizdata.append(dict(question=text(child(n,'q-text')).strip(),options=[dict(label=text(b).strip(),correct=b.attrs.get('data-ok')=='1') for b in walk(n) if cls(b,'q-btn')],answer=text(child(n,'q-answer')).strip(),trivia=cls(n,'trivia')))
Path('src/lessons/magic-ink/questions.ts').write_text('export const knowledgeQuestions = '+js(quizdata)+';\n',encoding='utf-8')
def emit(n,mode='lesson'):
 if isinstance(n,str):return '{'+js(n)+'}' if n.strip() else '\n'
 a=n.attrs; id=a.get('id',''); tag=n.tag
 if mode=='lesson':
  if n in quizzes:return '<KnowledgeQuiz index={'+str(quizzes.index(n))+'} />'
  if id=='trivia-score':return '<TriviaScore />'
  if id=='cap-game':return '<CapillaryRace />'
  if id=='rb-game':return '<RainbowBridge />'
  if cls(n,'back-link'):return ''
 attrs=[]
 for k,v in a.items():
  if k=='style':
   style={}
   for part in v.split(';'):
    if ':' in part:
     key,value=part.split(':',1); key=re.sub(r'-([a-z])',lambda m:m[1].upper(),key.strip()); style[key]=value.strip()
   attrs.append('style={'+js(style)+'}')
  elif k=='src':attrs.append('src={import.meta.env.BASE_URL + '+js(v.replace('../','',1))+'}')
  elif k=='class':attrs.append('className='+js(v))
  elif k=='disabled':attrs.append('disabled')
  else:attrs.append(k+'='+js(v))
 if tag=='img':
  w,h=Image.open(Path('pages')/a['src']).size
  attrs.extend(['width={'+str(w)+'}','height={'+str(h)+'}'])
 if mode in ['cap','rb']:
  # 原視覺結構以 React props 控制；不再綁定原 DOM script。
  if cls(n,'cap-lane'):
   tag='button'; mat=a['data-mat']; attrs=[x for x in attrs if not x.startswith('className=')]
   attrs += ['type="button"', 'className={"cap-lane" + (picked === '+js(mat)+' ? " picked" : "")}', 'disabled={phase !== 0}', 'aria-pressed={picked === '+js(mat)+'}', 'onClick={() => onPick('+js(mat)+')}']
  if cls(n,'cap-rise'):
   mat=next(x.attrs['data-mat'] for x in allnodes if cls(x,'cap-lane') and n in list(walk(x)))
   attrs=[x for x in attrs if not x.startswith('style=')]
   attrs+=['style={{background: "var(--info)", height: phase ? '+js({'towel':'92%','rope':'55%','plastic':'4%'}[mat])+' : "0%", transition: phase ? '+js('height '+str({'towel':3,'rope':4.5,'plastic':1.2}[mat])+'s ease-out')+' : "none"}}']
  if id in ['cg-start','rb-start']:
   attrs=[x for x in attrs if x!='disabled']; attrs+=['disabled={!canStart}', 'onClick={onStart}', 'type="button"']
  if id in ['cg-reset','rb-reset']:
   attrs=[x for x in attrs if not x.startswith('style=')]; attrs+=['hidden={!done}', 'onClick={onReset}', 'type="button"']
  if id in ['cg-result','rb-result']:return '<div className="cg-result show" role="status">{done && result}</div>'
  if cls(n,'rb-chip'):
   side=next(x.attrs['data-side'] for x in allnodes if cls(x,'rb-guess-box') and n in list(walk(x)))
   color=a['data-color'];attrs=[x for x in attrs if not x.startswith('className=')]
   attrs+=['type="button"','className={"rb-chip" + (picks.'+side+' === '+js(color)+' ? " picked" : "")}', 'disabled={phase !== 0}', 'aria-pressed={picks.'+side+' === '+js(color)+'}', 'onClick={() => onPick('+js(side)+', '+js(color)+')}']
  if cls(n,'rb-guess-box'):attrs+=['role="group"','aria-label='+js('左邊空罐' if a['data-side']=='left' else '右邊空罐')]
  if cls(n,'rb-legfill') or cls(n,'rb-flow') or cls(n,'rb-water'):
   original=next((x for x in attrs if x.startswith('style=')), 'style={{}}'); style=json.loads(original[len('style={'):-1]);attrs=[x for x in attrs if not x.startswith('style=')]
   threshold=1 if cls(n,'fup') else 2 if cls(n,'rb-flow') else 3 if cls(n,'fdown') else 4
   key='width' if cls(n,'rb-flow') else 'height'; value='100%'; initial='0%'
   duration='0.6s linear' if threshold==1 else '1.2s linear' if threshold==2 else '0.5s linear' if threshold==3 else '2.2s ease'
   if cls(n,'rb-water'):value='40%' if id in ['rb-w1','rb-w3','rb-w5'] else '38%';initial=style.pop('height','0%')
   attrs+=['style={{...'+js(style)+', '+key+': phase >= '+str(threshold)+' ? '+js(value)+' : '+js(initial)+', transition: phase ? '+js(key+' '+duration)+' : "none"}}']
  if tag=='button' and not any(x.startswith('type=') for x in attrs):attrs+=['type="button"']
 inner=''.join(emit(c,mode) for c in n.children)
 return '<'+tag+' '+' '.join(attrs)+(' />' if tag in ['img','br','input','hr'] else '>'+inner+'</'+tag+'>')
wrap=next(n for n in allnodes if cls(n,'wrap'))
Path('src/lessons/magic-ink/LessonContent.tsx').write_text('import { KnowledgeQuiz, TriviaScore, CapillaryRace, RainbowBridge } from "./interactions";\nexport function LessonContent() { return ('+emit(wrap)+'); }\n',encoding='utf-8')
for mode,id,name,props in [('cap','cap-game','CapillaryView','CapillaryViewProps'),('rb','rb-game','RainbowView','RainbowViewProps')]:
 node=next(n for n in allnodes if n.attrs.get('id')==id)
 destruct='picked, phase, canStart, done, onPick, onStart, onReset, result' if mode=='cap' else 'picks, phase, canStart, done, onPick, onStart, onReset, result'
 Path('src/lessons/magic-ink/'+name+'.tsx').write_text('import type { '+props+' } from "./interactions";\nexport function '+name+'({'+destruct+'}: '+props+') { return ('+emit(node,mode)+'); }\n',encoding='utf-8')
print('Generated lesson, 5 quizzes, 2 interactive views with intrinsic image sizes.')
