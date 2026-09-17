import { PageLayout } from '../../components/PageLayout';
import { LabProvider } from './interactions';
import { LessonContent } from './LessonContent';
import '../../../assets/css/styles.css';
import './water-acid-base.css';
export function WaterAcidBase() {
  return <PageLayout><div className="water-lesson"><LabProvider><LessonContent /></LabProvider></div></PageLayout>;
}
