import { PageLayout } from '../../components/PageLayout';
import { LessonNav } from '../../components/LessonNav';
import { LabProvider } from './interactions';
import { LessonContent } from './LessonContent';
import '../../../assets/css/styles.css';
import './water-acid-base.css';
export function WaterAcidBase() {
  return <PageLayout activityTitle="水與酸鹼的微觀奧秘"><LessonNav items={[
    { id: 'slide2', label: '水與解離' }, { id: 'slide3', label: '認識 pH / pOH' },
    { id: 'slide4', label: '平衡守則' }, { id: 'slide5', label: '互動實驗室' },
  ]} /><div className="water-lesson"><LabProvider><LessonContent /></LabProvider></div></PageLayout>;
}
