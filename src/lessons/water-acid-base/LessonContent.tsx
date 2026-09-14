import { Beaker, Question, useLab } from './interactions';
export function LessonContent() { const lab = useLab(); return <><div className="slide-container title-slide" id="slide1">
<div className="deco-bubble" style={{"width":"60px","height":"60px","top":"15%","left":"10%"}}></div>
<div className="deco-bubble" style={{"width":"40px","height":"40px","bottom":"20%","right":"12%"}}></div>
<div className="deco-bubble" style={{"width":"25px","height":"25px","top":"50%","right":"8%"}}></div>
<div className="title-layout">
<div className="academic-badge">{"🧪 微觀化學與酸鹼平衡 🧪"}</div>
<h1 >{"水與酸鹼的微觀奧秘"}</h1>
<p className="subtitle">{"用簡單直覺的視角，探索液體中的離子行為與 pH/pOH 的平衡美學"}</p>
</div>
</div>
<div className="slide-container" id="slide2">
<h2 className="slide-title" style={{"borderLeftColor":"#4fc3f7"}}>{"1. 水：完美的「解離媒介」"}</h2>
<div className="content-area">
<div className="two-column">
<div className="text-column">
<h3 style={{"color":"#4fc3f7"}}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>{" 水分子是如何幫助物質解離的？"}</h3>
<p >{"水是由一個氧原子 and 兩個氫原子構成的極性分子。因為帶有微小的正負電性，當鹽類、酸 or 鹼放進水中時，水分子會將它們包圍並拉開，這個過程就叫"}<strong >{"「解離」"}</strong>{"。"}</p>
<p >{"不只如此，水分子彼此之間也會發生微弱的"}<strong >{"「自我解離」"}</strong>{"，產生兩種性質相反的微小粒子："}</p>
<p >
<i className="fa-solid fa-circle-nodes" style={{"color":"#ff8a65","marginRight":"8px"}} aria-hidden="true"></i><strong >{"氫離子 [hydrogen ion] (H⁺)："}</strong>{" 決定溶液「酸性」的主角。"}<br />{" "}
<i className="fa-solid fa-circle-nodes" style={{"color":"#4db6ac","marginRight":"8px"}} aria-hidden="true"></i><strong >{"氫氧根離子 [hydroxide ion] (OH⁻)："}</strong>{" 決定溶液「鹼性」的主角。\n                    "}</p>
<div id="formula-container" className="formula-container">
<math display="block">
<mrow >
<msub ><mi >{"H"}</mi><mn >{"2"}</mn></msub><mi >{"O"}</mi>
<mo >{"⇌"}</mo>
<msup ><mi >{"H"}</mi><mo >{"+"}</mo></msup>
<mo >{"+"}</mo>
<mi >{"O"}</mi><msup ><mi >{"H"}</mi><mo >{"−"}</mo></msup>
</mrow>
</math>
</div>
</div>
<div className="image-column">
<div className="image-wrapper" style={{"borderColor":"#90caf9","display":"flex","alignItems":"center","justifyContent":"center","backgroundColor":"#ffffff","padding":"10px"}}>

<svg viewBox="0 0 400 300" width="100%" height="100%" style={{"maxHeight":"350px"}}>
<g stroke="#f8f9fa" strokeWidth="1.5">
<line x1="0" y1="50" x2="400" y2="50"></line>
<line x1="0" y1="100" x2="400" y2="100"></line>
<line x1="0" y1="150" x2="400" y2="150"></line>
<line x1="0" y1="200" x2="400" y2="200"></line>
<line x1="0" y1="250" x2="400" y2="250"></line>
<line x1="100" y1="0" x2="100" y2="300"></line>
<line x1="200" y1="0" x2="200" y2="300"></line>
<line x1="300" y1="0" x2="300" y2="300"></line>
</g>

<g transform="translate(80, 150)">
<circle cx="0" cy="0" r="32" fill="#e3f2fd" stroke="#4fc3f7" strokeWidth="3"></circle>
<text x="0" y="8" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="22" fontWeight="bold" fill="#0288d1" textAnchor="middle">{"O"}</text>
<circle cx="-26" cy="-26" r="16" fill="#ffffff" stroke="#90caf9" strokeWidth="3"></circle>
<text x="-26" y="-21" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="13" fontWeight="bold" fill="#0288d1" textAnchor="middle">{"H"}</text>
<circle cx="26" cy="-26" r="16" fill="#ffffff" stroke="#90caf9" strokeWidth="3"></circle>
<text x="26" y="-21" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="13" fontWeight="bold" fill="#0288d1" textAnchor="middle">{"H"}</text>
<text x="0" y="60" fontFamily="'Noto Sans TC'" fontSize="15" fontWeight="700" fill="#4a3e3d" textAnchor="middle">{"水分子 (H₂O)"}</text>
</g>

<g transform="translate(195, 150)">
<path d="M -25,-6 L 25,-6 M 15,-11 L 25,-6 L 15,-1" fill="none" stroke="#78909c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"></path>
<path d="M 25,6 L -25,6 M -15,1 L -25,6 L -15,11" fill="none" stroke="#78909c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"></path>
<text x="0" y="-22" fontFamily="'Noto Sans TC'" fontSize="13" fontWeight="700" fill="#78909c" textAnchor="middle">{"弱解離"}</text>
</g>

<g transform="translate(310, 150)">
<g transform="translate(0, -50)">
<circle cx="0" cy="0" r="18" fill="#fff9f8" stroke="#ff8a65" strokeWidth="3"></circle>
<text x="0" y="6" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="15" fontWeight="bold" fill="#ff8a65" textAnchor="middle">{"H⁺"}</text>
<text x="0" y="32" fontFamily="'Noto Sans TC'" fontSize="13" fontWeight="700" fill="#ff8a65" textAnchor="middle">{"氫離子"}</text>
</g>
<g transform="translate(0, 50)">
<circle cx="-10" cy="0" r="22" fill="#f2fbf9" stroke="#4db6ac" strokeWidth="3"></circle>
<text x="-10" y="6" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="15" fontWeight="bold" fill="#4db6ac" textAnchor="middle">{"O"}</text>
<circle cx="12" cy="0" r="13" fill="#ffffff" stroke="#4db6ac" strokeWidth="2.5"></circle>
<text x="12" y="5" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="10" fontWeight="bold" fill="#4db6ac" textAnchor="middle">{"H"}</text>
<circle cx="23" cy="-12" r="8" fill="#4db6ac"></circle>
<text x="23" y="-9" fontFamily="'Fredoka'" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle">{"-"}</text>
<text x="0" y="38" fontFamily="'Noto Sans TC'" fontSize="13" fontWeight="700" fill="#4db6ac" textAnchor="middle">{"氫氧根離子 (OH⁻)"}</text>
</g>
</g>
</svg>
</div>
</div>
</div>
</div>
</div>
<div className="slide-container" id="slide3">
<h2 className="slide-title" style={{"borderLeftColor":"#ff8a65"}}>{"2. 什麼是 pH 與 pOH？"}</h2>
<div className="content-area">
<div className="tiled-content">
<div className="tile tile-ph">
<div className="tile-icon"><i className="fa-solid fa-droplet" aria-hidden="true"></i></div>
<h3 style={{"color":"#ff8a65"}}>{"pH值：酸度的測量尺"}</h3>
<p >{"pH 值用來衡量溶液中"}<strong >{"氫離子 [hydrogen ion] (H⁺)"}</strong>{" 的濃度大小。"}</p>
<p >{"當 pH 值"}<strong >{"小於 7"}</strong>{"時，代表溶液中的 H⁺ 比較多，溶液呈現"}<strong >{"酸性"}</strong>{"（例如：檸檬汁、醋）。數值越小，酸性就越強。"}</p>
</div>
<div className="tile tile-poh">
<div className="tile-icon"><i className="fa-solid fa-soap" aria-hidden="true"></i></div>
<h3 style={{"color":"#4db6ac"}}>{"pOH值：鹼度的測量尺"}</h3>
<p >{"pOH 值用來衡量溶液中"}<strong >{"氫氧根離子 [hydroxide ion] (OH⁻)"}</strong>{" 的濃度大小。"}</p>
<p >{"當 pOH 值"}<strong >{"小於 7"}</strong>{"時，代表溶液中的 OH⁻ 比較多，溶液呈現"}<strong >{"鹼性"}</strong>{"（例如：小蘇打水、肥皂水）。數值越小，鹼性越明顯。"}</p>
</div>
</div>
</div>
</div>
<div className="slide-container" id="slide4">
<h2 className="slide-title" style={{"borderLeftColor":"#4db6ac"}}>{"3. pH 與 pOH 的 14 平衡守則"}</h2>
<div className="content-area">
<div className="wide-layout">
<div className="wide-top-bar">
<div className="wide-text-intro">
<p ><strong >{"完美互補的微觀天平："}</strong>{"在同一個水溶液世界中，酸性主角與鹼性主角就像在玩蹺蹺板：一邊增加，另一邊就必然減少。在 25°C 的標準狀態下，"}<strong >{"不論溶液是酸還是鹼，pH 值與 pOH 值的加總永遠剛好等於 14！"}</strong></p>
</div>
<div id="ph-formula-container" className="formula-container" style={{"borderColor":"#4db6ac","backgroundColor":"#f2fbf9","marginTop":"0","whiteSpace":"nowrap","flexShrink":"0"}}>
<math display="block">
<mrow >
<mtext >{"pH"}</mtext>
<mo >{"+"}</mo>
<mtext >{"pOH"}</mtext>
<mo >{"="}</mo>
<mn >{"14"}</mn>
</mrow>
</math>
</div>
</div>
<div className="wide-image-wrapper">
<svg viewBox="0 0 1000 320" width="100%" height="100%" style={{"maxHeight":"330px"}}>
<defs >
<linearGradient id="phGrad" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stopColor="#ff5252"></stop>
<stop offset="25%" stopColor="#ffb74d"></stop>
<stop offset="50%" stopColor="#4db6ac"></stop>
<stop offset="75%" stopColor="#26c6da"></stop>
<stop offset="100%" stopColor="#5c6bc0"></stop>
</linearGradient>
<linearGradient id="acidWedge" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stopColor="#ff8a65" stopOpacity="0.8"></stop>
<stop offset="100%" stopColor="#ff8a65" stopOpacity="0.1"></stop>
</linearGradient>
<linearGradient id="alkaliWedge" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stopColor="#4db6ac" stopOpacity="0.1"></stop>
<stop offset="100%" stopColor="#4db6ac" stopOpacity="0.8"></stop>
</linearGradient>
</defs>
<rect width="1000" height="320" rx="20" fill="#fafafa" stroke="#eeeeee" strokeWidth="1"></rect>
<line x1="100" y1="80" x2="100" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="157" y1="80" x2="157" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="271" y1="80" x2="271" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="329" y1="80" x2="329" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="386" y1="80" x2="386" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="443" y1="80" x2="443" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="557" y1="80" x2="557" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="614" y1="80" x2="614" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="729" y1="80" x2="729" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="786" y1="80" x2="786" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="843" y1="80" x2="843" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>
<line x1="900" y1="80" x2="900" y2="180" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3"></line>

<line x1="214" y1="50" x2="214" y2="180" stroke="#ff8a65" strokeWidth="2" strokeDasharray="4,2"></line>
<g transform="translate(144, 12)">
<rect x="0" y="0" width="140" height="36" rx="10" fill="#fff5f5" stroke="#ff8a65" strokeWidth="2"></rect>
<text x="70" y="23" fontFamily="'Noto Sans TC'" fontSize="14" fontWeight="700" fill="#c0392b" textAnchor="middle">{"🍋 檸檬 (pH 2)"}</text>
</g>

<line x1="500" y1="50" x2="500" y2="180" stroke="#4fc3f7" strokeWidth="2" strokeDasharray="4,2"></line>
<g transform="translate(430, 12)">
<rect x="0" y="0" width="140" height="36" rx="10" fill="#f0faff" stroke="#4fc3f7" strokeWidth="2"></rect>
<text x="70" y="23" fontFamily="'Noto Sans TC'" fontSize="14" fontWeight="700" fill="#0288d1" textAnchor="middle">{"💧 純水 (pH 7)"}</text>
</g>

<line x1="671" y1="50" x2="671" y2="180" stroke="#4db6ac" strokeWidth="2" strokeDasharray="4,2"></line>
<g transform="translate(601, 12)">
<rect x="0" y="0" width="140" height="36" rx="10" fill="#f2fbf9" stroke="#4db6ac" strokeWidth="2"></rect>
<text x="70" y="23" fontFamily="'Noto Sans TC'" fontSize="14" fontWeight="700" fill="#00796b" textAnchor="middle">{"🧼 肥皂 (pH 10)"}</text>
</g>

<text x="50" y="96" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="22" fontWeight="900" fill="#e5532b" textAnchor="middle">{"pH"}</text>
<g fontFamily="'Fredoka'" fontSize="16" fontWeight="bold" fill="#4a3e3d" textAnchor="middle">
<text x="100" y="95">{"0"}</text>
<text x="157" y="95">{"1"}</text>
<text x="214" y="95" fill="#ff5252" fontSize="18">{"2"}</text>
<text x="271" y="95">{"3"}</text>
<text x="329" y="95">{"4"}</text>
<text x="386" y="95">{"5"}</text>
<text x="443" y="95">{"6"}</text>
<text x="500" y="95" fill="#0288d1" fontSize="19">{"7"}</text>
<text x="557" y="95">{"8"}</text>
<text x="614" y="95">{"9"}</text>
<text x="671" y="95" fill="#00796b" fontSize="18">{"10"}</text>
<text x="729" y="95">{"11"}</text>
<text x="786" y="95">{"12"}</text>
<text x="843" y="95">{"13"}</text>
<text x="900" y="95">{"14"}</text>
</g>

<rect x="100" y="112" width="800" height="26" rx="13" fill="url(#phGrad)"></rect>

<g stroke="#ffffff" strokeWidth="2.5" opacity="0.8">
<line x1="100" y1="112" x2="100" y2="138"></line>
<line x1="157" y1="112" x2="157" y2="138"></line>
<line x1="214" y1="112" x2="214" y2="138"></line>
<line x1="271" y1="112" x2="271" y2="138"></line>
<line x1="329" y1="112" x2="329" y2="138"></line>
<line x1="386" y1="112" x2="386" y2="138"></line>
<line x1="443" y1="112" x2="443" y2="138"></line>
<line x1="500" y1="112" x2="500" y2="138" strokeWidth="3.5"></line>
<line x1="557" y1="112" x2="557" y2="138"></line>
<line x1="614" y1="112" x2="614" y2="138"></line>
<line x1="671" y1="112" x2="671" y2="138"></line>
<line x1="729" y1="112" x2="729" y2="138"></line>
<line x1="786" y1="112" x2="786" y2="138"></line>
<line x1="843" y1="112" x2="843" y2="138"></line>
<line x1="900" y1="112" x2="900" y2="138"></line>
</g>

<text x="50" y="166" fontFamily="'Fredoka', 'Noto Sans TC'" fontSize="22" fontWeight="900" fill="#1f8b80" textAnchor="middle">{"pOH"}</text>
<g fontFamily="'Fredoka'" fontSize="16" fontWeight="bold" fill="#6d5d5b" textAnchor="middle">
<text x="100" y="165">{"14"}</text>
<text x="157" y="165">{"13"}</text>
<text x="214" y="165" fill="#ff5252" fontSize="18">{"12"}</text>
<text x="271" y="165">{"11"}</text>
<text x="329" y="165">{"10"}</text>
<text x="386" y="165">{"9"}</text>
<text x="443" y="165">{"8"}</text>
<text x="500" y="165" fill="#0288d1" fontSize="19">{"7"}</text>
<text x="557" y="165">{"6"}</text>
<text x="614" y="165">{"5"}</text>
<text x="671" y="165" fill="#00796b" fontSize="18">{"4"}</text>
<text x="729" y="165">{"3"}</text>
<text x="786" y="165">{"2"}</text>
<text x="843" y="165">{"1"}</text>
<text x="900" y="165">{"0"}</text>
</g>

<polygon points="100,195 900,215 100,215" fill="url(#acidWedge)"></polygon>
<text x="100" y="232" fontFamily="'Noto Sans TC'" fontSize="14" fontWeight="700" fill="#e5532b">{"\n                            👈 H⁺ 離子極多 (酸性環境，pH 值低)\n                        "}</text>
<polygon points="100,260 900,260 900,240" fill="url(#alkaliWedge)"></polygon>
<text x="900" y="277" fontFamily="'Noto Sans TC'" fontSize="14" fontWeight="700" fill="#1f8b80" textAnchor="end">{"\n                            OH⁻ 離子極多 (鹼性環境，pOH 值低) 👉\n                        "}</text>

<rect x="350" y="285" width="300" height="28" rx="14" fill="#e3f2fd" stroke="#90caf9" strokeWidth="1.5"></rect>
<text x="500" y="304" fontFamily="'Noto Sans TC'" fontSize="13" fontWeight="700" fill="#0d47a1" textAnchor="middle">{"\n                            💡 垂直對齊的兩數相加： pH + pOH = 14 !\n                        "}</text>
</svg>
</div>
</div>
</div>
</div>
<div className="slide-container" id="slide5" style={{"backgroundColor":"#f6f9fc","border":"8px solid #cfd8dc"}}>
<h2 className="slide-title" style={{"borderLeftColor":"#ffb74d"}}>{"4. 探索水溶液的化學性質"}</h2>
<div className="content-area">
<div className="two-column" style={{"gridTemplateColumns":"1fr 1.15fr","gap":"40px","alignItems":"stretch","height":"100%"}}>

<div style={{"display":"flex","flexDirection":"column","justifyContent":"space-between","background":"#ffffff","border":"3px dashed #b0bec5","borderRadius":"24px","padding":"18px","boxShadow":"0 4px 15px rgba(0,0,0,0.02)"}}>
<div style={{"textAlign":"center"}}>
<span style={{"fontSize":"14px","fontWeight":"bold","backgroundColor":"#ffefe5","color":"#e65100","padding":"4px 14px","borderRadius":"20px","border":"1.5px solid #ffcc80"}}>{"\n                            🧪 互動式化學實驗：NaOH 溶於水\n                        "}</span>

<div style={{"margin":"12px auto 0","width":"95%","backgroundColor":"#fafbfc","border":"2px dashed #cbd5e1","borderRadius":"16px","padding":"8px 12px","textAlign":"left"}}>
<div style={{"fontSize":"13px","fontWeight":"bold","color":"#475569","textAlign":"center","marginBottom":"8px"}}>{"\n                                🎈 酚酞指示劑變色特徵\n                            "}</div>
<div style={{"display":"flex","justifyContent":"space-around","alignItems":"center","gap":"8px"}}>

<div style={{"display":"flex","flexDirection":"column","alignItems":"center","flex":"1"}}>
<div style={{"position":"relative","width":"22px","height":"48px"}}>
<div style={{"width":"26px","height":"5px","background":"#94a3b8","borderRadius":"3px","marginLeft":"-2px"}}></div>
<div style={{"width":"22px","height":"43px","border":"2.5px solid #94a3b8","borderTop":"none","borderRadius":"0 0 11px 11px","background":"#ffffff","overflow":"hidden","position":"relative"}}>
<div style={{"position":"absolute","bottom":"0","left":"0","width":"100%","height":"60%","background":"rgba(241, 245, 249, 0.5)","borderTop":"1.5px solid #cbd5e1"}}></div>
</div>
</div>
<span style={{"fontSize":"11px","fontWeight":"bold","color":"#64748b","marginTop":"4px"}}>{"酸性/中性"}</span>
<span style={{"fontSize":"10px","color":"#94a3b8","fontWeight":"500"}}>{"(無色透明)"}</span>
</div>

<div style={{"display":"flex","flexDirection":"column","alignItems":"center","flex":"1"}}>
<div style={{"position":"relative","width":"22px","height":"48px"}}>
<div style={{"width":"26px","height":"5px","background":"#94a3b8","borderRadius":"3px","marginLeft":"-2px"}}></div>
<div style={{"width":"22px","height":"43px","border":"2.5px solid #94a3b8","borderTop":"none","borderRadius":"0 0 11px 11px","background":"#ffffff","overflow":"hidden","position":"relative"}}>
<div style={{"position":"absolute","bottom":"0","left":"0","width":"100%","height":"60%","background":"#fbcfe8","borderTop":"1.5px solid #f472b6"}}>
<div style={{"position":"absolute","bottom":"4px","left":"4px","width":"3px","height":"3px","borderRadius":"50%","background":"rgba(255,255,255,0.75)"}}></div>
</div>
</div>
</div>
<span style={{"fontSize":"11px","fontWeight":"bold","color":"#db2777","marginTop":"4px"}}>{"微鹼性"}</span>
<span style={{"fontSize":"10px","color":"#f472b6","fontWeight":"500"}}>{"(粉紅色)"}</span>
</div>

<div style={{"display":"flex","flexDirection":"column","alignItems":"center","flex":"1"}}>
<div style={{"position":"relative","width":"22px","height":"48px"}}>
<div style={{"width":"26px","height":"5px","background":"#94a3b8","borderRadius":"3px","marginLeft":"-2px"}}></div>
<div style={{"width":"22px","height":"43px","border":"2.5px solid #94a3b8","borderTop":"none","borderRadius":"0 0 11px 11px","background":"#ffffff","overflow":"hidden","position":"relative"}}>
<div style={{"position":"absolute","bottom":"0","left":"0","width":"100%","height":"60%","background":"#ec4899","borderTop":"1.5px solid #be185d"}}>
<div style={{"position":"absolute","bottom":"5px","left":"3px","width":"3px","height":"3px","borderRadius":"50%","background":"rgba(255,255,255,0.85)"}}></div>
<div style={{"position":"absolute","bottom":"12px","left":"10px","width":"2px","height":"2px","borderRadius":"50%","background":"rgba(255,255,255,0.6)"}}></div>
</div>
</div>
</div>
<span style={{"fontSize":"11px","fontWeight":"bold","color":"#9d174d","marginTop":"4px"}}>{"強鹼性"}</span>
<span style={{"fontSize":"10px","color":"#db2777","fontWeight":"500"}}>{"(深粉紅色)"}</span>
</div>
</div>
</div>
<p style={{"fontSize":"14px","color":"#78909c","marginTop":"8px"}}>{"操作下方控制鈕，觀察杯中離子的增長與變化："}</p>
</div>

<Beaker />

<div style={{"display":"flex","gap":"10px","justifyContent":"center","width":"100%"}}>
<button className="lab-btn lab-btn-add" onClick={lab.addNaOH} disabled={lab.pendingNa || lab.count >= 6} type="button"><i className="fa-solid fa-plus" aria-hidden="true"></i>{" 放一片 NaOH 固體"}</button>
<button className="lab-btn lab-btn-indicator" onClick={lab.addIndicator} disabled={lab.pendingIndicator || lab.indicator} type="button"><i className="fa-solid fa-droplet" aria-hidden="true"></i>{" 滴入酚酞指示劑"}</button>
<button className="lab-btn lab-btn-reset" onClick={lab.reset} type="button"><i className="fa-solid fa-rotate-left" aria-hidden="true"></i>{" 重設"}</button>
</div>
</div>

<div style={{"display":"flex","flexDirection":"column","justifyContent":"center"}}>
<Question index={0} />
<Question index={1} />
<Question index={2} />
</div>
</div>
</div>
</div></>; }
