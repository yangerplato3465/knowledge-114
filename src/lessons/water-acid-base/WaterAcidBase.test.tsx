// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LabProvider, temperatureFor } from './interactions';
import { LessonContent } from './LessonContent';
import { questions } from './questions';
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup() { vi.useFakeTimers(); return render(<StrictMode><LabProvider><LessonContent /></LabProvider></StrictMode>); }
const add = () => fireEvent.click(screen.getByRole('button', {name:/放一片/}));
const advance = (ms=600) => act(() => vi.advanceTimersByTime(ms));
it('保留五張教材標題、段落、公式與三題全部選項', () => {
  const baseline = JSON.parse(readFileSync('tests/fixtures/water-acid-base-content.json','utf8'));
  const saved = (selector: string): string[] => baseline[selector].map((s: string) => s.replace(/\s+/g, ' ').trim());
  const {container} = setup();
  const texts = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map(n=>n.textContent?.replace(/\s+/g,' ').trim());
  expect(texts(container,'h1,h2,h3')).toEqual(saved('h1,h2,h3'));
  expect(texts(container,'p:not(.experiment-status)')).toEqual(saved('p'));
  expect(texts(container,'math').map(s=>s?.replace(/\s/g,''))).toEqual(saved('math').map(s=>s?.replace(/\s/g,'')));
  expect(questions.flatMap(q=>q.options.map(o=>o.label))).toEqual(saved('.option-btn'));
  expect(questions.flatMap(q=>q.options.map(o=>o.correct))).toEqual(baseline.correct);
});
it('投放節奏、連點保護、六片上限、離子與溫度保持等價', () => {
  const {container}=setup(); add(); add(); advance(599);
  expect(screen.getByText('25.0°C')).toBeTruthy(); advance(1);
  expect(screen.getByText('39.5°C')).toBeTruthy();
  for(let i=0;i<7;i++){add();advance();}
  expect(temperatureFor(6)).toBe(85);
  expect(screen.getByText('85.0°C')).toBeTruthy();
  expect(container.querySelectorAll('.floating-ion')).toHaveLength(12);
  expect((screen.getByRole('button',{name:/放一片/}) as HTMLButtonElement).disabled).toBe(true);
});
it('指示劑先加入仍無色，加入 NaOH 才變粉紅，作答可改答', () => {
  const {container}=setup(); fireEvent.click(screen.getByRole('button',{name:/滴入酚酞/})); advance(500);
  expect(container.querySelector('#water-liquid.pink')).toBeNull(); add(); advance();
  expect(container.querySelector('#water-liquid.pink')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'無溫度變化'}));
  expect(screen.getByText(/答案不太對喔/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'放熱反應 (溫度上升)'}));
  expect(screen.getByText(/答對了/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'重設'}));
  expect(screen.queryByText(/答對了/)).toBeNull();
  expect(container.querySelector('#water-liquid.pink')).toBeNull();
});
it('重設與卸載取消尚未完成的兩種投放，不依赖 animationend', () => {
  const {container,unmount}=setup(); add(); fireEvent.click(screen.getByRole('button',{name:/滴入酚酞/}));
  fireEvent.click(screen.getByRole('button',{name:'重設'})); advance();
  expect(screen.getByText('25.0°C')).toBeTruthy();
  expect(container.querySelectorAll('.floating-ion')).toHaveLength(0);
  add(); unmount(); expect(vi.getTimerCount()).toBe(0);
});

