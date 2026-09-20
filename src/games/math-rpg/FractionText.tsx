import { Fragment, type ReactNode } from 'react';

/** 保留純文字題庫；僅將明確的分數記號轉為可讀的 DOM 分數。 */
export function FractionText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /(?:(\d+)又)?(\d+|□)\/(\d+|□)/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(offset, match.index));
    const [, whole, numerator, denominator] = match;
    const read = (value: string) => value === '□' ? '空格' : value;
    const label = `${whole ? `${whole}又` : ''}${read(denominator)}分之${read(numerator)}`;
    parts.push(<span className="mr-fraction" role="img" aria-label={label} key={match.index}>
      <span className="mr-fraction-visual" aria-hidden="true">
        {whole && <span className="mr-fraction-whole">{whole}</span>}
        <span className="mr-fraction-stack"><span>{numerator}</span><span>{denominator}</span></span>
      </span>
    </span>);
    offset = match.index! + match[0].length;
  }
  parts.push(text.slice(offset));
  return <>{parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)}</>;
}
