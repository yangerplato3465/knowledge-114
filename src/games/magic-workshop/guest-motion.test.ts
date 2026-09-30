import { describe, expect, it } from 'vitest';
import { GuestMotion } from './guest-motion';
describe('客人動線', () => {
  it.each([0,400,2200,2900])('回工坊立即清除客人與待切換目標（%i ms）',elapsed=>{
    const motion=new GuestMotion();motion.request(0);motion.advance(elapsed);motion.request(1);
    motion.clear();expect(motion.index).toBeNull();expect(motion.desired).toBeNull();expect(motion.phase).toBe('absent');
    motion.advance(10000);expect(motion.index).toBeNull();
    motion.request(3);expect(motion.index).toBe(3);expect(motion.phase).toBe('enter');
  });
  it('側身步行到中央才轉向玩家，操作重繪不重啟入場', () => {
    const motion = new GuestMotion(); motion.request(0); motion.advance(400);
    expect(motion.pose().frame).toBeLessThan(4); expect(motion.pose().x).toBeGreaterThan(.5);
    motion.request(0); expect(motion.elapsed).toBe(400);
    motion.advance(1700); expect(motion.phase).toBe('turn'); expect(motion.pose().x).toBe(.5);
    motion.advance(480); expect(motion.phase).toBe('idle'); expect(motion.pose().frame).toBe(5);
  });
  it('前客致意、轉身走出後才讓下一位進場，快速切換只保留最新客人', () => {
    const motion = new GuestMotion(); motion.request(0, true); motion.request(1);
    expect(motion.phase).toBe('thanks'); motion.advance(600); expect(motion.phase).toBe('leave-turn');
    motion.advance(400); expect(motion.pose().facing).toBe(-1);
    motion.request(3); motion.advance(1700); expect(motion.index).toBe(3); expect(motion.phase).toBe('enter');
  });
  it('減少動態與離場直接收斂到最新狀態，不留下舊回呼', () => {
    const motion = new GuestMotion(); motion.request(0); motion.request(4, true);
    expect(motion.index).toBe(4); expect(motion.phase).toBe('idle');
    motion.request(null); motion.advance(2700); expect(motion.index).toBeNull(); expect(motion.phase).toBe('absent');
  });
});
