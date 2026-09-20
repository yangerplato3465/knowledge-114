// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { FractionText } from './FractionText';
afterEach(cleanup);

test('帶分數與空格維持上下順序，提供中文讀取名稱且不重複讀取數字', () => {
  const { container } = render(<FractionText text="2又7/11＝2又□/22，22 ÷ 2＝11。" />);
  expect(screen.getByRole('img', { name: '2又11分之7' })).toBeTruthy();
  expect(screen.getByRole('img', { name: '2又22分之空格' })).toBeTruthy();
  const stacks = container.querySelectorAll('.mr-fraction-stack');
  expect(stacks[0].children[0].textContent).toBe('7'); expect(stacks[0].children[1].textContent).toBe('11');
  expect(container.querySelectorAll('.mr-fraction-visual[aria-hidden="true"]')).toHaveLength(2);
  expect(container.textContent).toContain('22 ÷ 2＝11。');
});

test('純文字、小數與整數選項不轉換為分數', () => {
  const { container } = render(<FractionText text="19.25＋0.75＝20" />);
  expect(container.textContent).toBe('19.25＋0.75＝20');
  expect(container.querySelector('.mr-fraction')).toBeNull();
});
