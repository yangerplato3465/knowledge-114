import { useEffect, useRef, useState } from 'react';
import { BattleSession, type BattleSnapshot } from './session';
import type { Question, QuestionPool } from './questions';

interface View {
  snapshot: BattleSnapshot; question: Question; feedback: string;
  playerHP: number; enemyHP: number;
}
export function useBattle(pool: QuestionPool) {
  const session = useRef<BattleSession | null>(null);
  const choose = useRef<(index: number) => void>(() => {});
  const [view, setView] = useState<View | null>(null);
  useEffect(() => {
    let current: View | null = null;
    let picked: number | null = null;
    const receive = (snapshot: BattleSnapshot) => {
      const newQuestion = !current || snapshot.questionId !== current.snapshot.questionId;
      const question = newQuestion ? (typeof pool === 'function' ? pool() : pool[Math.floor(Math.random() * pool.length)]) : current!.question;
      if (newQuestion) picked = null;
      let feedback = newQuestion ? '' : current!.feedback;
      if (snapshot.phase === 'resolving' && snapshot.cue === null) {
        feedback = snapshot.state.combo > 0 ? '答對了！' : `${picked === null ? '時間到！' : '答錯了！'}正確答案是 ${question.a[question.correct]}。`;
      }
      const reveal = newQuestion || snapshot.cue === 'impact' || snapshot.cue === 'status-tick';
      current = { snapshot, question, feedback,
        playerHP: reveal ? snapshot.state.playerHP : current!.playerHP,
        enemyHP: reveal ? snapshot.state.enemyHP : current!.enemyHP };
      setView(current);
    };
    const game = new BattleSession({ onChange: receive });
    session.current = game;
    receive(game.getSnapshot());
    choose.current = index => {
      if (!current || current.snapshot.phase !== 'question') return;
      picked = performance.now() >= current.snapshot.deadline! ? null : index;
      game.answer(index === current.question.correct ? 'correct' : 'wrong', current.snapshot.questionId);
    };
    return () => { game.dispose(); session.current = null; choose.current = () => {}; };
  }, [pool]);
  return { view, answer: (index: number) => choose.current(index),
    upgrade: (title: string) => session.current?.chooseUpgrade(title), reset: () => session.current?.reset() };
}
