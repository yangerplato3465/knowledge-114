import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ResourceLinks } from '../components/ResourceLinks';
import { teacherTools } from '../content/teacherTools';

export function TeacherTools() {
  return <><a className="skip-link" href="#main">跳至主要內容</a><SiteHeader navigation />
    <main id="main" className="directory-page teacher-directory" tabIndex={-1}>
      <div className="directory-intro"><p className="page-kicker">老師工作室</p><h1>老師工具</h1><p className="page-lead">備課、分享素材與管理班級，從這裡開始。</p></div>
      <ResourceLinks items={teacherTools} />
    </main><SiteFooter />
  </>;
}
