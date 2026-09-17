import type { RainbowViewProps } from "./interactions";
export function RainbowView({picks, phase, canStart, done, onPick, onStart, onReset, result}: RainbowViewProps) { return (<div className="cap-game" id="rb-game">
<div className="cg-title">{"🌈 互動小遊戲：彩虹橋——水會自己過橋！"}</div>
<div className="cg-hint">{"紙巾橋已經架好了！藍、黃、紅三罐水會沿著紙巾「走」過橋，流進中間的空罐子。先猜猜看：兩個空罐子裡會出現什麼顏色？兩題都選好才能開始喔！"}</div>
<div className="rb-stage">
<div className="rb-bridge" style={{"left": "10%", "width": "20%"}}>
<div className="rb-arch"><div className="rb-flow fl" style={{...{"background": "#4a90d9"}, width: phase >= 2 ? "100%" : "0%", transition: phase ? "width 1.2s linear" : "none"}}></div></div>
<div className="rb-leg lleg"><div className="rb-legfill fup" style={{...{"background": "#4a90d9"}, height: phase >= 1 ? "100%" : "0%", transition: phase ? "height 0.6s linear" : "none"}}></div></div>
<div className="rb-leg rleg"><div className="rb-legfill fdown" style={{...{"background": "#4a90d9"}, height: phase >= 3 ? "100%" : "0%", transition: phase ? "height 0.5s linear" : "none"}}></div></div>
</div>
<div className="rb-bridge" style={{"left": "30%", "width": "20%"}}>
<div className="rb-arch"><div className="rb-flow fr" style={{...{"background": "#f2c94c"}, width: phase >= 2 ? "100%" : "0%", transition: phase ? "width 1.2s linear" : "none"}}></div></div>
<div className="rb-leg rleg"><div className="rb-legfill fup" style={{...{"background": "#f2c94c"}, height: phase >= 1 ? "100%" : "0%", transition: phase ? "height 0.6s linear" : "none"}}></div></div>
<div className="rb-leg lleg"><div className="rb-legfill fdown" style={{...{"background": "#f2c94c"}, height: phase >= 3 ? "100%" : "0%", transition: phase ? "height 0.5s linear" : "none"}}></div></div>
</div>
<div className="rb-bridge" style={{"left": "50%", "width": "20%"}}>
<div className="rb-arch"><div className="rb-flow fl" style={{...{"background": "#f2c94c"}, width: phase >= 2 ? "100%" : "0%", transition: phase ? "width 1.2s linear" : "none"}}></div></div>
<div className="rb-leg lleg"><div className="rb-legfill fup" style={{...{"background": "#f2c94c"}, height: phase >= 1 ? "100%" : "0%", transition: phase ? "height 0.6s linear" : "none"}}></div></div>
<div className="rb-leg rleg"><div className="rb-legfill fdown" style={{...{"background": "#f2c94c"}, height: phase >= 3 ? "100%" : "0%", transition: phase ? "height 0.5s linear" : "none"}}></div></div>
</div>
<div className="rb-bridge" style={{"left": "70%", "width": "20%"}}>
<div className="rb-arch"><div className="rb-flow fr" style={{...{"background": "#e05656"}, width: phase >= 2 ? "100%" : "0%", transition: phase ? "width 1.2s linear" : "none"}}></div></div>
<div className="rb-leg rleg"><div className="rb-legfill fup" style={{...{"background": "#e05656"}, height: phase >= 1 ? "100%" : "0%", transition: phase ? "height 0.6s linear" : "none"}}></div></div>
<div className="rb-leg lleg"><div className="rb-legfill fdown" style={{...{"background": "#e05656"}, height: phase >= 3 ? "100%" : "0%", transition: phase ? "height 0.5s linear" : "none"}}></div></div>
</div>
<div className="rb-row">
<div className="rb-cell">
<div className="rb-jar"><div className="rb-water" id="rb-w1" style={{...{"background": "#4a90d9"}, height: phase >= 4 ? "40%" : "55%", transition: phase ? "height 2.2s ease" : "none"}}></div></div>
<div className="rb-tag">{"💙 藍"}</div>
</div>
<div className="rb-cell">
<div className="rb-jar"><div className="rb-water" id="rb-w2" style={{...{"background": "#4caf6d"}, height: phase >= 4 ? "38%" : "0%", transition: phase ? "height 2.2s ease" : "none"}}></div></div>
<div className="rb-tag">{"❓ 空罐"}</div>
</div>
<div className="rb-cell">
<div className="rb-jar"><div className="rb-water" id="rb-w3" style={{...{"background": "#f2c94c"}, height: phase >= 4 ? "40%" : "55%", transition: phase ? "height 2.2s ease" : "none"}}></div></div>
<div className="rb-tag">{"💛 黃"}</div>
</div>
<div className="rb-cell">
<div className="rb-jar"><div className="rb-water" id="rb-w4" style={{...{"background": "#ef8f3c"}, height: phase >= 4 ? "38%" : "0%", transition: phase ? "height 2.2s ease" : "none"}}></div></div>
<div className="rb-tag">{"❓ 空罐"}</div>
</div>
<div className="rb-cell">
<div className="rb-jar"><div className="rb-water" id="rb-w5" style={{...{"background": "#e05656"}, height: phase >= 4 ? "40%" : "55%", transition: phase ? "height 2.2s ease" : "none"}}></div></div>
<div className="rb-tag">{"❤️ 紅"}</div>
</div>
</div>
</div>
<div className="rb-guess">
<div className="rb-guess-box" data-side="left" role="group" aria-label="左邊空罐">
<div className="g-q">{"左邊空罐：💙 藍 ＋ 💛 黃 ＝ ？"}</div>
<button data-color="green" type="button" className={"rb-chip" + (picks.left === "green" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.left === "green"} onClick={() => onPick("left", "green")}>{"🟢 綠色"}</button>
<button data-color="purple" type="button" className={"rb-chip" + (picks.left === "purple" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.left === "purple"} onClick={() => onPick("left", "purple")}>{"🟣 紫色"}</button>
<button data-color="brown" type="button" className={"rb-chip" + (picks.left === "brown" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.left === "brown"} onClick={() => onPick("left", "brown")}>{"🤎 咖啡色"}</button>
</div>
<div className="rb-guess-box" data-side="right" role="group" aria-label="右邊空罐">
<div className="g-q">{"右邊空罐：💛 黃 ＋ ❤️ 紅 ＝ ？"}</div>
<button data-color="orange" type="button" className={"rb-chip" + (picks.right === "orange" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.right === "orange"} onClick={() => onPick("right", "orange")}>{"🟠 橘色"}</button>
<button data-color="green" type="button" className={"rb-chip" + (picks.right === "green" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.right === "green"} onClick={() => onPick("right", "green")}>{"🟢 綠色"}</button>
<button data-color="pink" type="button" className={"rb-chip" + (picks.right === "pink" ? " picked" : "")} disabled={phase !== 0} aria-pressed={picks.right === "pink"} onClick={() => onPick("right", "pink")}>{"🩷 粉紅色"}</button>
</div>
</div>
<div className="cg-controls">
<button className="q-btn" id="rb-start" disabled={!canStart} onClick={onStart} type="button">{"🌈 開始過橋"}</button>
<button className="q-btn" id="rb-reset" hidden={!done} onClick={onReset} type="button">{"🔄 再玩一次"}</button>
</div>
<div className="cg-result show" role="status">{done && result}</div>
</div>); }
