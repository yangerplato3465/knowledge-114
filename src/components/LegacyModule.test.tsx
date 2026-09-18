// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { LegacyModule } from './LegacyModule';

afterEach(cleanup);
test('更換模組後舊 script 的錯誤不會污染新的載入狀態', () => {
  const view = render(<LegacyModule src="assets/js/class-rpg.js" loading="載入班級" />);
  const old = document.querySelector('script')!;
  view.rerender(<LegacyModule src="assets/js/class-rpg-game.js" loading="載入世界" />);
  fireEvent.error(old);
  expect(screen.getByRole('status').textContent).toBe('載入世界');
  fireEvent.load(document.querySelector('script')!);
  expect(screen.getByRole('status').textContent).toBe('');
  view.unmount();
  expect(document.querySelector('script')).toBeNull();
});
