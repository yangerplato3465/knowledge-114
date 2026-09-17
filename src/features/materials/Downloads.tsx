import { PageLayout } from '../../components/PageLayout';
import { downloadURL, formatSize } from './api';
import { useMaterials } from './useMaterials';
import './materials.css';

export function Downloads() {
  const list = useMaterials();
  return <PageLayout><section className="hub-card materials" aria-labelledby="downloads-title">
    <h1 id="downloads-title">素材下載</h1><p>點右側按鈕即可下載遊戲素材。</p>
    <button onClick={() => void list.reload()}>重新整理</button>
    {list.loading ? <p role="status">載入中…</p> : list.error ? <p role="alert">{list.error}</p> : !list.files.length ? <p role="status">素材庫還是空的，快去上傳第一個檔案吧！</p> :
      <ul className="material-list">{list.files.map(file => <li key={file.name} className="material-row"><div><strong>{file.name}</strong><small>{formatSize(file.size)}</small></div>
        <a className="material-action" href={downloadURL(file.name)} download={file.name} aria-label={`下載 ${file.name}`}>下載</a></li>)}</ul>}
  </section></PageLayout>;
}
