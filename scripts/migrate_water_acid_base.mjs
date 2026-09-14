// One-time, explicit regeneration from the preserved lesson; not a build step.
import { JSDOM } from 'jsdom';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const doc = new JSDOM(readFileSync('pages/water-acid-base.html', 'utf8')).window.document;
const dir = 'src/lessons/water-acid-base';
mkdirSync(dir, { recursive: true });
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const q = JSON.stringify;
const cards = [...doc.querySelectorAll('.question-card')];
writeFileSync(`${dir}/questions.ts`, `export const questions = ${q(cards.map(card => ({question: card.querySelector('p').textContent, options: [...card.querySelectorAll('button')].map(b => ({label:b.textContent, correct:b.getAttribute('onclick').includes('true')}))})))};\n`);
function emit(n) {
  if (n.nodeType === 3) return n.textContent.trim() ? `{${q(n.textContent)}}` : '\n';
  if (n.nodeType !== 1) return '';
  if (n.localName === 'br') return '<br />{" "}';
  if (cards.includes(n)) return `<Question index={${cards.indexOf(n)}} />`;
  if (n.id === 'beaker-wrapper') return '<Beaker />';
  const attrs = [...n.attributes].map(({name,value}) => {
    if(name==='onclick') return ({'addNaOH()':'onClick={lab.addNaOH} disabled={lab.pendingNa || lab.count >= 6}', 'addIndicator()':'onClick={lab.addIndicator} disabled={lab.pendingIndicator || lab.indicator}', 'resetExperiment()':'onClick={lab.reset}'})[value];
    if(name==='style') return `style={${q(Object.fromEntries(value.split(';').filter(s=>s.includes(':')).map(s=>{const i=s.indexOf(':');return [camel(s.slice(0,i).trim()),s.slice(i+1).trim()]})))}}`;
    if(name==='class') name='className';
    else if (!name.startsWith('aria-') && !name.startsWith('data-')) name=camel(name);
    if(name==='display' && value==='math') value='block';
    return `${name}=${q(value)}`;
  });
  if(n.localName==='button') attrs.push('type="button"');
  if(n.localName==='i') attrs.push('aria-hidden="true"');
  return `<${n.localName} ${attrs.join(' ')}>${[...n.childNodes].map(emit).join('')}</${n.localName}>`;
}
writeFileSync(`${dir}/LessonContent.tsx`, `import { Beaker, Question, useLab } from './interactions';\nexport function LessonContent() { const lab = useLab(); return <>${[...doc.querySelectorAll('body > .slide-container')].map(emit).join('\n')}</>; }\n`);

