import { ForestAtmosphere } from '../components/ForestArt';
import { TeacherHeader } from '../components/TeacherHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ResourceLinks } from '../components/ResourceLinks';
import { teacherTools } from '../content/teacherTools';

export function TeacherTools() {
  return <><a className="skip-link" href="#main">跳至主要內容</a><TeacherHeader />
    <main id="main" className="directory-page teacher-directory" tabIndex={-1}><ForestAtmosphere />
      <div className="directory-intro forest-intro"><div><p className="page-kicker">森林裡的備課時光</p><h1>老師工具</h1><p className="page-lead">把靈感整理好，<br />陪每一份好奇一起長大。</p></div></div>
      <ResourceLinks items={teacherTools} />
    </main><SiteFooter />
  </>;
}
