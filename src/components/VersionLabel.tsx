import { version } from '../../config.json';

export function VersionLabel() {
  return <span className="version-label" aria-label="網站版本">v{version}</span>;
}
