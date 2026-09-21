import { useEffect, useRef, useState } from 'react';
import { artUrl, REGIONS } from './battle-art';

export function Spark({ className = '' }: { className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z" fill="currentColor" /></svg>;
}
export function Journey({ stage = -1 }: { stage?: number }) {
  return <ol className="mr-journey" aria-label="五關冒險路線">{REGIONS.map((region, index) => <li key={region.name} data-state={index < stage ? 'done' : index === stage ? 'current' : 'next'} aria-current={index === stage ? 'step' : undefined}><span>{index < stage ? '✓' : `0${index + 1}`}</span><strong>{region.name}</strong></li>)}</ol>;
}
export function AdventurePoster() {
  return <div className="mr-poster" aria-hidden="true">
    <span className="mr-poster-sun" /><span className="mr-poster-cloud mr-cloud-one" /><span className="mr-poster-cloud mr-cloud-two" />
    <div className="mr-poster-hills" /><div className="mr-poster-ground" />
    <span className="mr-poster-tag"><Spark /> 每個答案，都是一點勇氣</span>
    <img className="mr-poster-hero" src={artUrl('hero/victory-frames/hero-victory-03-v1')} alt="" width="128" height="128" />
    <img className="mr-poster-slime" src={artUrl('enemies/stage-1/slime/frames/slime-idle-01-v1')} alt="" width="128" height="128" />
    <span className="mr-poster-flower mr-flower-one">✦</span><span className="mr-poster-flower mr-flower-two">✦</span>
    <span className="mr-poster-note">YOUR LITTLE BIG ADVENTURE</span>
  </div>;
}
export const REWARDS = [
  { label: '2 個 Anita 幣', short: '2 幣', weight: 45 },
  { label: '3 個 Anita 幣', short: '3 幣', weight: 35 },
  { label: '5 個 Anita 幣', short: '5 幣', weight: 17 },
  { label: '10 個 Anita 幣', short: '10 幣', weight: 2 },
  { label: '給 Anita 老師大大的擁抱', short: '抱抱', weight: 1 },
] as const;
const REWARD_COLORS = ['#a9d6b5', '#ffd58c', '#c1d7ef', '#e0c5e3', '#f7bab0'];
export const REWARD_SECTORS = REWARDS.map((reward, index) => {
  const start = REWARDS.slice(0, index).reduce((sum, item) => sum + item.weight, 0) * 3.6;
  const end = start + reward.weight * 3.6;
  return { ...reward, start, end, center: (start + end) / 2, color: REWARD_COLORS[index] };
});
export const rewardRotation = (index: number) => 1800 - REWARD_SECTORS[index].center;
const wheelBackground = `conic-gradient(${REWARD_SECTORS.map(sector => `${sector.color} ${sector.start}deg ${sector.end}deg`).join(', ')})`;
export function rewardIndex(value: number) {
  let total = 0;
  return REWARDS.findIndex(reward => { total += reward.weight; return value < total; });
}
export function VictoryReward() {
  const [result, setResult] = useState<number | null>(null), [done, setDone] = useState(false);
  const [title, setTitle] = useState('');
  const locked = useRef(false), timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const spin = () => {
    if (locked.current) return;
    locked.current = true;
    const value = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * 100;
    setResult(rewardIndex(value));
    setTitle(['晨光探險家', '閃亮小劍士', '勇氣收藏家', '星光解謎手'][crypto.getRandomValues(new Uint32Array(1))[0] % 4]);
    timer.current = window.setTimeout(() => setDone(true), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2400);
  };
  return <div className="mr-reward">
    <div className="mr-wheel-wrap" aria-hidden="true"><span className="mr-wheel-pointer" /><div className="mr-wheel" style={{ background: wheelBackground, transform: `rotate(${result === null ? 0 : rewardRotation(result)}deg)` }}>
      {REWARD_SECTORS.filter(sector => sector.weight >= 10).map(sector => <span key={sector.short} style={{ left: `calc(50% + ${Math.sin(sector.center * Math.PI / 180) * 60}px)`, top: `calc(50% - ${Math.cos(sector.center * Math.PI / 180) * 60}px)` }}>{sector.short}</span>)}
    </div><div className="mr-wheel-center"><Spark /></div></div>
    <div><p className="mr-eyebrow">勇氣值得被獎勵</p><h3>{done && result !== null ? REWARDS[result].label : '轉出你的冒險驚喜'}</h3>
      <p role="status">{done ? '請把這個畫面給老師看，由老師確認與發放。' : result === null ? '完成五關的你，值得為自己鼓掌！' : '幸運轉盤轉動中…'}</p>
      {done && <p className="mr-achievement"><Spark /> 本局稱號：{title}</p>}
      <button className="mr-primary" disabled={result !== null} onClick={spin}>{done ? '獎勵已揭曉' : result === null ? '轉動獎勵轉盤' : '正在轉動…'}</button>
      <p className="mr-help">僅本局顯示，不存入帳號；擁抱需老師同意，也可改成擊掌或空氣抱抱。</p>
      <ul className="mr-reward-legend" aria-label="獎項與抽獎機率">{REWARD_SECTORS.map(sector => <li key={sector.short}><i aria-hidden="true" style={{ background: sector.color }} /><span>{sector.label}</span><strong>{sector.weight}%</strong></li>)}</ul>
      <p className="mr-help">扇形大小代表中獎機率；小扇形的完整獎項請對照色標。</p>
    </div>
  </div>;
}
