import { ForestArt } from '../../components/ForestArt';
import { PageLayout } from '../../components/PageLayout';
import { downloadURL, formatSize } from './api';
import { useMaterials } from './useMaterials';
import './materials.css';

export function Downloads() {
  const list = useMaterials();
  return <PageLayout current="downloads"><section className="hub-card materials" aria-labelledby="downloads-title">
    <ForestArt name="library" className="material-illustration" /><h1 id="downloads-title">素材下載</h1><p>教材與素材都在這裡。找到需要的檔案，再按「下載」。</p>
    <button onClick={() => void list.reload()}>重新整理</button>
    {list.loading ? <p role="status">正在載入素材清單…</p> : list.error ? <p role="alert">{list.error}</p> : !list.files.length ? <p role="status">目前還沒有可下載的素材，稍後再來看看。</p> :
      <ul className="material-list">{list.files.map(file => <li key={file.name} className="material-row"><div><strong>{file.name}</strong><small>{formatSize(file.size)}</small></div>
        <a className="material-action" href={downloadURL(file.name)} download={file.name} aria-label={`下載 ${file.name}`}>下載</a></li>)}</ul>}
  </section></PageLayout>;
}
