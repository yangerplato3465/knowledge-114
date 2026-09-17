import type { CapillaryViewProps } from "./interactions";
export function CapillaryView({picked, phase, canStart, done, onPick, onStart, onReset, result}: CapillaryViewProps) { return (<div className="cap-game" id="cap-game">
<div className="cg-title">{"🏁 互動小遊戲：吸水大賽"}</div>
<div className="cg-hint">{"三位選手要比賽把水吸上去！先"}<b >{"點選"}</b>{"你覺得會吸得最快、最高的選手，再按「開始比賽」看看猜得對不對～"}</div>
<div className="cap-lanes">
<button data-mat="towel" type="button" className={"cap-lane" + (picked === "towel" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picked === "towel"} onClick={() => onPick("towel")}>
<div className="cap-stage">
<div className="cap-strip towel"><div className="cap-rise" style={{background: "var(--info)", height: phase ? "92%" : "0%", transition: phase ? "height 3s ease-out" : "none"}}></div></div>
<div className="cap-beaker"><div className="cap-water" style={{"background": "#5aa9e6"}}></div></div>
</div>
<div className="cap-label">{"🧻 紙巾"}</div>
</button>
<button data-mat="rope" type="button" className={"cap-lane" + (picked === "rope" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picked === "rope"} onClick={() => onPick("rope")}>
<div className="cap-stage">
<div className="cap-strip rope"><div className="cap-rise" style={{background: "var(--info)", height: phase ? "55%" : "0%", transition: phase ? "height 4.5s ease-out" : "none"}}></div></div>
<div className="cap-beaker"><div className="cap-water" style={{"background": "#e66a8a"}}></div></div>
</div>
<div className="cap-label">{"🧶 棉繩"}</div>
</button>
<button data-mat="plastic" type="button" className={"cap-lane" + (picked === "plastic" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picked === "plastic"} onClick={() => onPick("plastic")}>
<div className="cap-stage">
<div className="cap-strip plastic"><div className="cap-rise" style={{background: "var(--info)", height: phase ? "4%" : "0%", transition: phase ? "height 1.2s ease-out" : "none"}}></div></div>
<div className="cap-beaker"><div className="cap-water" style={{"background": "#eda94f"}}></div></div>
</div>
<div className="cap-label">{"🥢 塑膠棒"}</div>
</button>
</div>
<div className="cg-controls">
<button className="q-btn" id="cg-start" disabled={!canStart} onClick={onStart} type="button">{"🏁 開始比賽"}</button>
<button className="q-btn" id="cg-reset" hidden={!done} onClick={onReset} type="button">{"🔄 再玩一次"}</button>
</div>
<div className="cg-result show" role="status">{done && result}</div>
</div>); }
