import { PageLayout } from '../../components/PageLayout';
import { QuizProvider } from './interactions';
import { LessonContent } from './LessonContent';
import '../../../assets/css/magic-ink.css';
import './magic-ink.css';
export function MagicInk() {
  return <PageLayout><div className="magic-ink-lesson"><QuizProvider><LessonContent /></QuizProvider></div></PageLayout>;
}
