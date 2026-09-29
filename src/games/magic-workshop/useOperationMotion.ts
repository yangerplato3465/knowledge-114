import { useLayoutEffect, type RefObject } from 'react';
import { currentPuzzle, type GameState } from './session';

import { OPERATION_MS } from './motion';

/** Presentation only: rules and accessible amounts commit immediately. */
export function useOperationMotion(board: RefObject<HTMLDivElement | null>, game: GameState) {
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const cancel = () => animations.forEach(animation => animation.cancel());
    const visibility = () => { if (document.hidden) cancel(); };
    const action = game.lastAction;
    const move = game.history.at(-1);
    if (!media.matches && !document.hidden && action && action !== 'deliver' && move && board.current) {
      const bottles = [...board.current.querySelectorAll<HTMLElement>('.mw-bottles .mw-bottle-vessel')];
      const animate = (element: Element | null | undefined, frames: Keyframe[]) => {
        const animation = element?.animate?.(frames, { duration: OPERATION_MS, easing: 'linear' });
        if (animation) animations.push(animation);
      };
      const capacities = currentPuzzle(game).capacities;
      bottles.forEach((bottle, index) => {
        if (move.before[index] === game.amounts[index]) return;
        const before = `${move.before[index] / capacities[index] * 100}%`;
        const after = `${game.amounts[index] / capacities[index] * 100}%`;
        animate(bottle.querySelector('.mw-bottle-liquid'), [
          { height: before, offset: 0 }, { height: before, offset: .15 },
          { height: after, offset: .85 }, { height: after, offset: 1 },
        ]);
        if (game.amounts[index] > 0) animate(bottle.querySelector('.mw-liquid-surface'), [
          { transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg)', offset: .35 },
          { transform: 'rotate(5deg)', offset: .6 }, { transform: 'rotate(-2deg)', offset: .85 }, { transform: 'rotate(0deg)' },
        ]);
      });
      if (action.kind !== 'fill') {
        const source = bottles[action.from];
        const destination = action.kind === 'pour' ? bottles[action.to!] : board.current.querySelector('.mw-recycler');
        if (source && destination) {
          const from = source.getBoundingClientRect(), to = destination.getBoundingClientRect();
          const angle = to.left + to.width / 2 >= from.left + from.width / 2 ? 24 : -24;
          animate(source, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${angle}deg)`, offset: .15 },
            { transform: `rotate(${angle}deg)`, offset: .85 }, { transform: 'rotate(0deg)' }]);
        }
      }
    }
    media.addEventListener('change', cancel);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', cancel);
    return () => {
      cancel();
      media.removeEventListener('change', cancel);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', cancel);
    };
    // Selection and hints must not restart an operation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, game.effectVersion]);
}
