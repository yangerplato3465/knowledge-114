export type ForestObject = 'science' | 'adventure' | 'lantern' | 'library' | 'ledger' | 'key';

export function ForestArt({ name, className = '' }: { name: ForestObject; className?: string }) {
  return <img className={'forest-object ' + className} src={`${import.meta.env.BASE_URL}assets/images/site/${name}.webp`}
    alt="" width="256" height="256" loading="lazy" decoding="async" aria-hidden="true" />;
}

export function ForestAtmosphere() {
  return <img className="directory-mist" src={import.meta.env.BASE_URL + 'assets/images/site/forest-arrival-small.webp'} alt="" aria-hidden="true" width="900" height="600" />;
}
