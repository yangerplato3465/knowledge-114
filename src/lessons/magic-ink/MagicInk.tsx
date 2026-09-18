import { PageLayout } from '../../components/PageLayout';
import { LessonNav } from '../../components/LessonNav';
import { QuizProvider } from './interactions';
import { LessonContent } from './LessonContent';
import '../../../assets/css/magic-ink.css';
import './magic-ink.css';
export function MagicInk() {
  return <PageLayout activityTitle="神奇的墨水！原子筆的科學"><LessonNav items={[
    { id: 'pen-world', label: '原子筆的世界' }, { id: 'ink', label: '墨水的奧秘' },
    { id: 'science', label: '科學小實驗' }, { id: 'story', label: '消失墨水' },
    { id: 'experiment', label: '變色魔法' }, { id: 'challenge', label: '回家挑戰' },
  ]} /><div className="magic-ink-lesson"><QuizProvider><LessonContent /></QuizProvider></div></PageLayout>;
}
