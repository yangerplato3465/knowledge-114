/** Independent of scene rebuilds, resize, focus and bottle selection. */
export class OrderEntrance {
  elapsed=0;
  active=false;
  begin(immediate=false) { this.elapsed=0;this.active=!immediate; }
  finish() { this.active=false; }
  advance(ms:number) {
    if(!this.active)return false;
    this.elapsed+=ms;
    if(this.elapsed>=1900){this.finish();return true;}
    return false;
  }
  pose() {
    if(!this.active)return {dock:1,scale:1};
    const t=Math.max(0,Math.min(1,(this.elapsed-1150)/750));
    const dock=t*t*(3-2*t);
    return {dock,scale:1+.55*(1-dock)};
  }
}
