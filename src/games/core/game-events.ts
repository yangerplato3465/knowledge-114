export type GameCommand =
  | { type: 'answer-selected'; answerId: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'set-reduced-motion'; enabled: boolean };

export type GameEvent =
  | { type: 'ready' }
  | { type: 'health-changed'; current: number; max: number }
  | { type: 'question-requested'; questionId: string }
  | { type: 'stage-completed'; stage: number }
  | { type: 'fatal-error'; message: string };
