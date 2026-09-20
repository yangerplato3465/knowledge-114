import { useId } from 'react';
import type { GeometryDiagramData } from './geometry-questions';

/** 題目已提供完整文字條件，圖作為輔助；不可依線段長度量測答案。 */
export function GeometryDiagram({ data }: { data?: GeometryDiagramData }) {
  const arrowId = useId();
  if (!data) return null;
  const rad = (a: number) => a * Math.PI / 180;
  const point = (angle: number) => [170 + 87 * Math.cos(rad(angle)), 112 + 87 * Math.sin(rad(angle))];
  let total = -90;
  const triangle = data.type === 'triangle' || data.type === 'split' || data.type === 'straight';
  const a = rad(data.angles[0]), b = rad(data.angles[1]);
  const height = triangle ? 170 / (1 / Math.tan(a) + 1 / Math.tan(b)) : 0;
  const top = [85 + height / Math.tan(a), 190 - height];
  // 較扁或較高的三角形統一縮放，保留各內角。
  // 外角題保留上方文字區，延長線也不得進入標籤區。
  const scale = triangle ? Math.min(1, (data.type === 'straight' ? 110 : 130) / height) : 1;
  const tx = 170 + (top[0] - 170) * scale, ty = 190 - height * scale;
  const lx = 170 - 85 * scale, rx = 170 + 85 * scale;
  const splitAngle = Number(data.labels[2]?.match(/^\d+/)?.[0] ?? 0);
  const splitX = tx + (190 - ty) / Math.tan(Math.atan2(190 - ty, lx - tx) - rad(splitAngle));
  const leftRay = Math.atan2(190 - ty, lx - tx);
  const splitRay = leftRay - rad(splitAngle);
  const rightRay = Math.atan2(190 - ty, rx - tx);
  const onRay = (angle: number, radius: number) => [tx + radius * Math.cos(angle), ty + radius * Math.sin(angle)];
  const exteriorRay = rightRay + Math.PI;
  const exteriorEnd = onRay(exteriorRay, 36);
  const exteriorTarget = onRay((leftRay + exteriorRay) / 2, 27);
  const exteriorLabelX = Math.max(65, Math.min(275, tx - 65));
  return <figure className="mr-geometry"><svg viewBox="0 0 340 250" role="img" aria-label="題目幾何示意圖，已知角度與條件見上方題目">
    <defs><marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><polygon points="0,0 8,4 0,8" fill="currentColor" /></marker></defs>
    {data.type === 'sector' ? data.angles.map((angle, i) => {
      const start = total, end = total + angle; total = end;
      const p = point(start), q = point(end), label = point((start + end) / 2);
      return <g key={i} className={i === data.angles.length - 1 ? 'mr-shaded-sector' : undefined}><path d={`M170 112 L${p.join(' ')} A87 87 0 ${angle > 180 ? 1 : 0} 1 ${q.join(' ')} Z`} fill={i === data.angles.length - 1 ? 'var(--mr-sector-fill, #b8c8df)' : 'none'} /><text x={170 + (label[0] - 170) * .63} y={116 + (label[1] - 112) * .63}>{data.labels[i]}</text></g>;
    }) : triangle ? <>
      <path d={`M${lx} 190 L${rx} 190 L${tx} ${ty} Z`} />
      {data.type === 'split' && <path d={`M${tx} ${ty} L${splitX} 190`} />}
      {data.type === 'straight' && <path d={`M${tx} ${ty} L${exteriorEnd.join(' ')}`} />}
      <text x={lx - 15} y={211}>{data.labels[0]}</text><text x={rx + 15} y={211}>{data.labels[1]}</text>
      {data.type === 'split' ? [[leftRay, splitRay, splitAngle], [splitRay, rightRay, data.angles[2] - splitAngle]].map(([start, end, angle], i) => {
        const radius = i === 0 ? 34 : 48;
        const from = onRay(start, radius), to = onRay(end, radius), target = onRay((start + end) / 2, radius);
        const labelX = Math.max(30, Math.min(310, tx + (i === 0 ? -70 : 85))), labelY = ty + 8;
        return <g key={i} className="mr-angle-callout">
          <path d={`M${from.join(' ')} A${radius} ${radius} 0 0 0 ${to.join(' ')}`} />
          <path d={`M${labelX} ${labelY + 9} Q${labelX} ${target[1]} ${target.join(' ')}`} markerEnd={`url(#${arrowId})`} />
          <text x={labelX} y={labelY}>{angle}°</text>
        </g>;
      }) : data.type === 'straight' ? <g className="mr-angle-callout">
        <path d={`M${onRay(leftRay, 27).join(' ')} A27 27 0 0 1 ${onRay(exteriorRay, 27).join(' ')}`} />
        <path d={`M${exteriorLabelX} 34 Q${exteriorLabelX - 15} ${exteriorTarget[1]} ${exteriorTarget.join(' ')}`} markerEnd={`url(#${arrowId})`} />
        <text x={exteriorLabelX} y={22}>{data.labels[2]}</text>
      </g> : <text x={tx} y={Math.max(22, ty - 14)}>{data.labels[2]}</text>}
    </> : <><path d={data.type === 'parallelogram' ? 'M70 55 L225 55 L275 175 L120 175 Z' : 'M75 70 L230 45 L280 180 L60 180 Z'} />{data.labels.map((label, i) => <text key={i} x={[75, 235, 275, 75][i]} y={[35, 25, 210, 210][i]}>{label}</text>)}</>}
  </svg><figcaption>示意圖不按比例繪製，請依題目標示計算。{data.type === 'sector' ? '有底色的部分為陰影扇形。' : ''}</figcaption></figure>;
}
