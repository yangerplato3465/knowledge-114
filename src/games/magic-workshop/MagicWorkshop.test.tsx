// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MagicWorkshop } from './MagicWorkshop';
import { ThemeProvider } from '../../features/theme/ThemeProvider';
import { createDeck, DIFFICULTY_SETTINGS } from './puzzles';
import { GUIDE, GUESTS } from './art';
import { shortestSolution, type Action } from './rules';

vi.mock('./WorkshopBackdrop', () => ({ WorkshopBackdrop: () => <div aria-hidden="true" /> }));
vi.mock('./workshop-music', () => ({ createWorkshopMusic: () => ({ start: vi.fn(), resume: vi.fn(), stop: vi.fn(), visibility: vi.fn(), destroy: vi.fn() }) }));
vi.mock('./WorkbenchEffects', () => ({ WorkbenchEffects: () => <div aria-hidden="true" /> }));
vi.mock('./CharacterPortrait', () => ({ CharacterPortrait: ({ art }: { art: string }) => <div data-character={art} aria-hidden="true" /> }));
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} })); });

it('拖曳支援補滿、互倒與倒空；空處、取消、重複 click 都不多計步', () => {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: '開始五關委託' }));
  const bottles = screen.getAllByRole('button', { name: /第 \d 瓶，容量/ });
  const spring = screen.getByRole('button', { name: /魔力泉/ });
  const recycler = screen.getByRole('button', { name: /回收釜/ });
  [bottles[0], bottles[1], spring, recycler].forEach((element, index) => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ left: index * 100, right: index * 100 + 80, top: 0, bottom: 100, width: 80, height: 100, x: index * 100, y: 0, toJSON() {} });
  });
  const move = (from: number, x: number, cancel = false) => {
    fireEvent.pointerDown(bottles[from], { pointerId: 1, button: 0, clientX: from * 100 + 30, clientY: 30 });
    fireEvent.pointerMove(bottles[from], { pointerId: 1, clientX: x, clientY: 30 });
    if (cancel) fireEvent.pointerCancel(bottles[from], { pointerId: 1 });
    else fireEvent.pointerUp(bottles[from], { pointerId: 1, clientX: x, clientY: 30 });
    fireEvent.click(bottles[from], { detail: 1 });
  };
  move(0, 230);
  expect(screen.getByText('查看操作紀錄（1 步）')).toBeTruthy();
  expect(bottles[0].getAttribute('aria-pressed')).toBe('false');
  move(0, 130);
  expect(screen.getByText('查看操作紀錄（2 步）')).toBeTruthy();
  move(1, 330);
  expect(screen.getByText('查看操作紀錄（3 步）')).toBeTruthy();
  move(0, 900);
  move(0, 230, true);
  move(0, 130); // Empty bottle cannot pour.
  fireEvent.pointerDown(bottles[0], { pointerId: 2, button: 0, clientX: 30, clientY: 30 });
  fireEvent.pointerMove(bottles[0], { pointerId: 2, clientX: 230, clientY: 30 });
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.pointerUp(bottles[0], { pointerId: 2, clientX: 230, clientY: 30 });
  fireEvent.pointerDown(bottles[0], { pointerId: 3, button: 0, clientX: 30, clientY: 30 });
  fireEvent.pointerMove(bottles[0], { pointerId: 3, clientX: 230, clientY: 30 });
  fireEvent.blur(window);
  fireEvent.pointerUp(bottles[0], { pointerId: 3, clientX: 230, clientY: 30 });
  expect(screen.getByText('查看操作紀錄（3 步）')).toBeTruthy();
  expect(document.querySelector('.mw-drag-preview')).toBeNull();
});

it('工坊是獨立遊戲，操作練習可補滿、復原並交付', () => {
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  expect(screen.getByRole('heading', { name: /量得剛剛好/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '先做操作練習' }));
  expect(screen.getByText(GUIDE.name)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /靜音/ })).toBeNull();
  const spring = screen.getByRole('button', { name: /魔力泉/ });
  expect(spring.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /第 1 瓶，容量 2 單位/ }));
  expect(spring.hasAttribute('disabled')).toBe(false);
  fireEvent.click(spring);
  expect(screen.getByText('委託完成，準備交付！')).toBeTruthy();
  expect(screen.getByRole('button', { name: '完成練習' })).toBeTruthy();
  expect(screen.queryByLabelText(/通關表現/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '復原一步' }));
  expect(screen.queryByText('委託完成，準備交付！')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '想一想提示' }));
  expect(screen.getByText(/觀察哪些瓶子還能補滿/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /第 1 瓶，容量 2 單位/ }));
  fireEvent.click(screen.getByRole('button', { name: /魔力泉/ }));
  fireEvent.click(screen.getByRole('button', { name: '完成練習' }));
  expect(screen.getByRole('heading', { name: '練習完成，準備接委託！' })).toBeTruthy();
});

it('完成才公布最短步數與表現星數；五關成果保留各關評價', () => {
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  fireEvent.click(screen.getByText('我有重玩代碼'));
  fireEvent.change(screen.getByRole('spinbutton', { name: /重玩代碼/ }), { target: { value: '27' } });
  fireEvent.click(screen.getByRole('button', { name: '開始五關委託' }));
  const perform = (action: Action) => {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`第 ${action.from + 1} 瓶，容量`) }));
    fireEvent.click(screen.getByRole('button', { name: action.kind === 'fill' ? /魔力泉/ : action.kind === 'empty' ? /回收釜/ : new RegExp(`第 ${action.to! + 1} 瓶，容量`) }));
  };
  const ratings = [3, 2, 1, 3, 3];
  for (const [index, puzzle] of createDeck(27, 3).entries()) {
    expect(screen.getByText(GUESTS[index].name)).toBeTruthy();
    expect(screen.getByText(GUESTS[index].title)).toBeTruthy();
    expect(screen.getByText(GUESTS[index].dialogue.request)).toBeTruthy();
    expect(screen.queryByLabelText(/通關表現/)).toBeNull();
    expect(screen.queryByText(new RegExp(`最短 ${puzzle.minimumSteps} 步`))).toBeNull();
    for (let detour = 0; detour < (index === 1 ? 1 : index === 2 ? 2 : 0); detour++) {
      perform({ kind: 'fill', from: 0 }); perform({ kind: 'empty', from: 0 });
    }
    const path = shortestSolution(puzzle)!;
    for (const action of path) perform(action);
    expect(screen.getByLabelText(`通關表現 ${ratings[index]} 星，共 3 星`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`最短 ${puzzle.minimumSteps} 步`))).toBeTruthy();
    expect(screen.getByText(GUESTS[index].dialogue.ready)).toBeTruthy();
    if (index === 0) {
      fireEvent.click(screen.getByRole('button', { name: '復原一步' }));
      expect(screen.queryByLabelText(/通關表現/)).toBeNull();
      perform(path.at(-1)!);
    }
    fireEvent.click(screen.getByRole('button', { name: index === 4 ? '交付並看成果' : '交付，前往下一關' }));
    expect(screen.getByText(`${GUESTS[index].name}收到了！`)).toBeTruthy();
    expect(screen.getByText(GUESTS[index].dialogue.thanks)).toBeTruthy();
    if (index < 4) {
      expect(screen.getByText(`${DIFFICULTY_SETTINGS[3].name}委託 · 第 ${index + 2} / 5 關`)).toBeTruthy();
      expect(screen.getByRole('button', { name: /第 1 瓶，容量/ }).hasAttribute('disabled')).toBe(false);
    }
  }
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(5);
  rows.forEach((row, index) => expect(within(row).getByLabelText(`通關表現 ${ratings[index]} 星，共 3 星`)).toBeTruthy());
  expect(document.querySelectorAll('.mw-rating-star')).toHaveLength(15);
  expect(document.querySelectorAll('.mw-rating-star[data-earned="true"]')).toHaveLength(12);
  expect(document.querySelector('.mw-ending-guide [data-character="guide"]')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '再挑戰一次' }));
  expect(screen.queryByLabelText('交付回饋')).toBeNull();
});

it.each([3, 4, 5] as const)('可選擇 %i 星與題組代碼，五關皆維持所選星級', difficulty => {
  render(<ThemeProvider><MagicWorkshop /></ThemeProvider>);
  fireEvent.click(screen.getAllByRole('radio')[difficulty - 3]);
  fireEvent.click(screen.getByText('我有重玩代碼'));
  fireEvent.change(screen.getByRole('spinbutton', { name: /重玩代碼/ }), { target: { value: '27' } });
  fireEvent.click(screen.getByRole('button', { name: '開始五關委託' }));
  expect(screen.getByText(`${DIFFICULTY_SETTINGS[difficulty].name}委託 · 第 1 / 5 關`)).toBeTruthy();
  expect(screen.queryByText(/題組 27/)).toBeNull();
  expect(screen.getByRole('list', { name: '五關進度' }).children).toHaveLength(5);
  expect(screen.getByLabelText(`${difficulty} 星難度`)).toBeTruthy();
});
