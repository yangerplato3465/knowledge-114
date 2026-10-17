import { ForestArt } from '../../components/ForestArt';
import { ForestEntryLink } from '../../components/ForestEntryLink';
import { PageLayout } from '../../components/PageLayout';
import { downloadURL, formatSize } from './api';
import { useMaterials } from './useMaterials';
import './materials.css';

function fileFormat(name: string) {
  const extension = name.match(/\.([a-z0-9]+)$/i)?.[1];
  return extension ? extension.toUpperCase() + ' 檔案' : '檔案';
}

export function Downloads() {
  const list = useMaterials();
  return <PageLayout current="downloads"><section className="hub-card materials downloads" aria-labelledby="downloads-title">
    <div className="downloads-intro"><ForestArt name="library" /><div><p className="page-kicker">森林裡的素材書架</p><h1 id="downloads-title">素材下載</h1><p>教材與素材都在這裡。點選需要的檔案，即可開啟或下載。</p></div></div>
    <div className="material-toolbar"><h2>挑一份需要的素材</h2><button onClick={() => void list.reload()}>重新整理</button></div>
    {list.loading ? <p role="status">正在載入素材清單…</p> : list.error ? <p role="alert">{list.error}</p> : !list.files.length ? <p role="status">目前還沒有可下載的素材，稍後再來看看。</p> :
      <ul className="material-list">{list.files.map(file => <li key={file.name}>
        <ForestEntryLink className="material-entry" href={downloadURL(file.name)} download={file.name} label={`下載 ${file.name}`} artwork="library" title={file.name}
          description={<>{fileFormat(file.name)} · <span>{formatSize(file.size)}</span></>} action="下載檔案" icon="download" />
      </li>)}</ul>}
  </section></PageLayout>;
}
