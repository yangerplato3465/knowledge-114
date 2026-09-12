import { KnowledgeQuiz, TriviaScore, CapillaryRace, RainbowBridge } from "./interactions";
export function LessonContent() { return (<div className="wrap">


<div className="brand-bar">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/logo.webp"} alt="超知識 SUPER SCIENCE KNOWLEDGE" width={450} height={183} />
<div className="brand-text">
<b >{"超知識 SUPER SCIENCE KNOWLEDGE"}</b><br  />{"\n            NATURE · LIFE · SCIENCE 科普教材系列\n        "}</div>
<div className="brand-right">{"1143L1 課程教材"}<br  />{"整理：Anita 老師"}</div>
</div>

<div className="hero">
<img className="cover" src={import.meta.env.BASE_URL + "assets/images/magic-ink/cover.webp"} alt="原子筆與筆記本封面照" width={2500} height={1875} />
<h1 >{"神奇的墨水！原子筆的科學"}</h1>
<div className="badges">
<span className="badge">{"📖 原子筆的世界"}</span>
<span className="badge">{"💧 墨水的奧秘"}</span>
<span className="badge">{"🔬 課後實驗：消失的墨水"}</span>
</div>
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"📜"}</div>
<h2 >{"原子筆的世界"}</h2>
<span className="sec-tag">{"歷史 · 名稱由來 · 構造"}</span>
</div>
<p className="sec-lead">{"每天寫功課、考卷、畫圖都離不開它。你有沒有想過：原子筆裡面到底長什麼樣子？它為什麼叫「原子」筆？"}</p>
<h3 className="block-title">{"開場提問：你喜歡粗筆還是細筆？"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/stroke-thick.webp"} alt="粗筆筆跡" loading="lazy" width={2500} height={1666} />
<div className="cap">{"粗筆：寫起來滑，但字比較粗"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/stroke-thin.webp"} alt="細筆筆跡" loading="lazy" width={2500} height={1666} />
<div className="cap">{"細筆：字細緻，但比較刮紙"}</div>
</div>
</div>
<h3 className="block-title">{"一支筆的百年旅程"}</h3>
<div className="hist">
<div className="hist-card">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/loud-patent.webp"} alt="John J. Loud 專利圖" loading="lazy" width={1536} height={1024} />
<div className="h-body">
<div className="h-year">{"1888"}</div>
<div className="h-title">{"🇺🇸 John J. Loud 取得最早專利"}</div>
<p >{"10 月 30 日發表。他想做一支能在粗糙木頭、厚包裝紙上寫字的筆——筆尖有一顆可以滾動的小鋼珠。可惜出墨不均勻、會漏水堵塞，專利沒有被開發而最終失效。"}</p>
</div>
</div>
<div className="hist-card">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/biro.webp"} alt="Ladislao José Bíró" loading="lazy" width={1536} height={1024} />
<div className="h-body">
<div className="h-year">{"1930s"}</div>
<div className="h-title">{"🇭🇺 記者 Bíró 的靈感"}</div>
<p >{"匈牙利記者 Ladislao José Bíró 深受鋼筆書寫不便之苦，發明了可以在手帕、木材表面寫字、不必灌墨水的 Ball Point Pen——透過滾動把墨「印」在紙上，像印報紙一樣方便。1940 年代和兄弟申請專利，商品化為「Biro 原子筆」。"}</p>
</div>
</div>
<div className="hist-card">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/atomic-bomb.webp"} alt="原子彈" loading="lazy" width={2500} height={1653} />
<div className="h-body">
<div className="h-year">{"戰後"}</div>
<div className="h-title">{"⚛️ 為什麼叫「原子」筆？"}</div>
<p >{"原子筆進入亞洲市場時沒有中文名稱。當時美國靠原子彈贏得二次大戰，「原子」成了最高科技與「勝利」的代名詞，許多商品都冠上「原子」兩個字提升形象、幫助銷售。"}</p>
</div>
</div>
<div className="hist-card">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/pastel-pens.webp"} alt="原子筆" loading="lazy" width={2500} height={1875} />
<div className="h-body">
<div className="h-year">{"現在"}</div>
<div className="h-title">{"🖊️ 名字一直流傳到今天"}</div>
<p >{"「原子筆」也代表「取用不完、源源不絕」的意思。後來沒有更新的創意產品取代它，這個名字就一直流傳到現在，大家也習慣用「原子筆」稱呼鋼珠筆。"}</p>
</div>
</div>
</div>
<h3 className="block-title">{"筆的演化：越來越方便"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-evolution.webp"} alt="羽毛筆到鋼筆到原子筆的演化" loading="lazy" width={1334} height={750} />
<div className="cap">{"羽毛筆（沾墨，麻煩）→ 鋼筆（滑順但容易漏墨）→ 原子筆（便宜、不漏、耐用）——最方便的進化版！"}</div>
</div>
<h3 className="block-title">{"拆開來看：裡面有好多零件！"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/pen-exploded.webp"} alt="原子筆分解圖" loading="lazy" width={1536} height={1024} />
<div className="cap">{"雖然外觀看起來很普通，但其實它有很多零件喔！"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/pen-parts.webp"} alt="拆解後的原子筆零件" loading="lazy" width={1536} height={1024} />
<div className="cap">{"課堂活動：拆一支不再用的筆，看看你能找到哪些零件？"}</div>
</div>
</div>
<h3 className="block-title">{"基本構造與筆尖放大圖"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-structure.webp"} alt="原子筆基本構造圖" loading="lazy" width={1334} height={750} />
<div className="cap">{"外層保護、按鈕開關、裝墨水的地方；筆芯放大：座、球珠座、球珠、油墨導向孔、墨盒、潤滑脂、埋塞"}</div>
</div>
<div className="photo" style={{"marginTop": "14px"}}>
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-ball-socket.webp"} alt="球珠固定方式放大圖" loading="lazy" width={1334} height={750} />
<div className="cap">{"球珠卡在小小的圓形槽裡——能滾、不會掉出來，精密程度用「微米」計算！"}</div>
</div>
<h3 className="block-title">{"筆尖的主角：球珠"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/ball-writing.webp"} alt="球珠寫字特寫" loading="lazy" width={2500} height={1406} />
<div className="cap">{"這顆小鋼球是筆的靈魂！一直滾、一直沾墨，把墨轉到紙上——一邊轉、一邊寫"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/tips-macro.webp"} alt="筆尖特寫" loading="lazy" width={2500} height={1668} />
<div className="cap">{"墨水黏度高＋球珠像塞子把出口封住＝不會像水一樣滴出來"}</div>
</div>
</div>
<h3 className="block-title">{"為什麼墨水不會一次流光？"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/ball-mechanism.webp"} alt="球珠帶墨四步驟原理圖" loading="lazy" width={940} height={680} />
<div className="cap">{"① 重力讓油墨落在圓珠內側 → ② 圓珠旋轉帶著墨出來 → ③ 在紙面留下印記 → ④ 圓珠轉回去再充墨"}</div>
</div>
<div className="info-box info">{"\n            毛細現象控制流量 ＋ 筆尖的「球」擋住出口 ＝ 墨水只會慢慢沾到球上，不會像倒水一樣整罐流出來。\n        "}</div>
<div className="photo" style={{"marginTop": "14px"}}>
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/tip-sizes.webp"} alt="0.5mm 0.7mm 1.0mm 筆尖粗細比較" loading="lazy" width={1536} height={1024} />
<div className="cap">{"設計筆的人會做出很多尺寸：0.5 / 0.7 / 1.0 mm，給不同的使用者"}</div>
</div>
<h3 className="block-title">{"☀️ 原子筆很怕高溫？「爆墨」原理"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/heat-pen.webp"} alt="放在桌上的筆與熱咖啡" loading="lazy" width={2500} height={1408} />
<div className="cap">{"高溫讓墨膨脹、壓力變大，墨就可能被擠出來"}</div>
</div>
<div >
<div className="info-box warn" style={{"marginTop": "0"}}>
<b >{"爆墨是怎麼發生的？"}</b><br  />{"\n                    把原子筆放在太陽底下曝曬，筆芯裡的墨受熱膨脹、壓力變大，就可能從筆尖被擠出來，造成「爆墨」。所以：原子筆不要放車上曬太陽、不要放在暖氣旁！\n                "}</div>
<div className="info-box info">
<b >{"反過來想 🤔"}</b>{" 平常不漏墨的祕密＝「黏稠的墨水」＋「球珠塞住出口」。只有高溫讓墨膨脹時，這道防線才會被突破。\n                "}</div>
</div>
</div>
<h3 className="block-title">{"🌟 超知識冷知識大挑戰（猜猜看！）"}</h3>
<p className="sec-lead" style={{"margin": "0 0 6px"}}>{"和同學互相出題吧！先猜再看答案，猜對一題得一分，四題全對就是「原子筆博士」🎓"}</p>
<div className="trivia-grid">
<KnowledgeQuiz index={0} />
<KnowledgeQuiz index={1} />
<KnowledgeQuiz index={2} />
<KnowledgeQuiz index={3} />
</div>
<TriviaScore />
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"💧"}</div>
<h2 >{"墨水的奧秘"}</h2>
<span className="sec-tag">{"成分 · 種類 · 特性"}</span>
</div>
<p className="sec-lead">{"墨水基本上就是："}<b >{"顏色 ＋ 能讓它流動的液體"}</b>{"，再加一些小配方讓它更好用。墨水跟飲料一樣有配方，只是不能喝！"}</p>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/ink-splash.webp"} alt="墨水潑灑" loading="lazy" width={2500} height={2000} />
<div className="cap">{"墨水是什麼？顏色＋能讓它流動的液體＋讓它更好用的小配方"}</div>
</div>
<h3 className="block-title">{"古代人用什麼寫字？"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-ancient-ink.webp"} alt="松煙墨與鐵膽墨" loading="lazy" width={1334} height={750} />
<div className="cap">{"古代中國：燒松木的煙做墨條，叫「松煙墨」；歐洲：用「鐵膽墨」寫聖經——但它會慢慢腐蝕紙張，變成棕色痕跡"}</div>
</div>
<div className="grid2" style={{"marginTop": "14px"}}>
<div className="mini-card">
<div className="m-emoji">{"🏮"}</div>
<div className="m-title">{"松煙墨（中國）"}</div>
<p >{"燒松木收集黑煙的碳粒，加膠做成墨條。磨墨時加水，就是書法用的墨汁——碳非常穩定，千年字畫依然烏黑！"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"⛪"}</div>
<div className="m-title">{"鐵膽墨（歐洲）"}</div>
<p >{"用鐵鹽＋植物中的單寧酸調成，寫聖經、寫樂譜都用它。缺點：含酸性物質，時間久了會腐蝕紙張、字跡轉棕。"}</p>
</div>
</div>
<h3 className="block-title">{"墨水三大成分"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-ink-parts.webp"} alt="墨水三大成分解析" loading="lazy" width={1334} height={750} />
<div className="cap">{"溶劑（水／油／酒精）＋ 顏料（色素／染料）＋ 添加物（防腐、增稠）"}</div>
</div>
<div className="grid3" style={{"marginTop": "14px"}}>
<div className="mini-card">
<div className="m-emoji">{"🥤"}</div>
<div className="m-title">{"溶劑"}</div>
<p >{"水 / 油 / 酒精——墨水的「載體」，讓墨水能流動。不同溶劑決定墨水的個性！"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🎨"}</div>
<div className="m-title">{"顏料"}</div>
<p >{"色素或染料——給墨水顏色的主角"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🧂"}</div>
<div className="m-title">{"添加物"}</div>
<p >{"防腐劑、增稠劑——讓墨水不發霉、濃稠度剛剛好"}</p>
</div>
</div>
<h3 className="block-title">{"染料 vs 色素：糖與沙子"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/dye-cups.webp"} alt="染料溶液" loading="lazy" width={2500} height={1667} />
<div className="cap">{"染料像糖，一倒進水就溶入——顏色亮麗"}</div>
</div>
<div >
<div className="mini-card" style={{"marginBottom": "14px"}}>
<div className="m-emoji">{"🍬"}</div>
<div className="m-title">{"染料＝糖"}</div>
<p >{"溶進水裡，顏色亮（藍筆、紅筆多用染料配方），但比較會褪色"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🏖️"}</div>
<div className="m-title">{"色素＝沙子"}</div>
<p >{"漂在水裡但不溶解，耐久不褪色——黑筆常用「碳黑」，所以黑色最耐久！"}</p>
</div>
</div>
</div>
<div className="info-box info">
<b >{"💡 這就解釋了："}</b>{"為什麼有些筆寫起來特別「亮」，有些筆的字放很久都不褪色——關鍵就在用了染料還是色素！\n        "}</div>
<h3 className="block-title">{"現代墨水四大類型"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-ink-types.webp"} alt="水性、油性、凝膠、酒精墨四大類" loading="lazy" width={1334} height={750} />
<div className="cap">{"每一種墨水都是為不同用途設計：白板筆用酒精所以擦得掉；油性筆寫塑膠比較好附著"}</div>
</div>
<div className="visc-bar"></div>
<div className="visc-labels"><span >{"水性"}</span><span >{"中性"}</span><span >{"中油"}</span><span >{"油性"}</span></div>
<div className="visc-sub"><span >{"淡・稀"}</span><span ></span><span ></span><span >{"濃・稠"}</span></div>
<h3 className="block-title">{"鋼筆、中性筆、原子筆比一比"}</h3>
<div className="cmp-wrap">
<table className="cmp">
<thead >
<tr ><th ></th><th >{"🖋️ 鋼筆"}</th><th >{"🖊️ 中性筆"}</th><th >{"🖊️ 原子筆"}</th></tr>
</thead>
<tbody >
<tr ><td >{"墨水"}</td><td >{"水性"}</td><td >{"水＋膠"}</td><td >{"油性"}</td></tr>
<tr ><td >{"寫感"}</td><td >{"最滑順"}</td><td >{"滑順又顯色"}</td><td >{"稍有阻力"}</td></tr>
<tr ><td >{"缺點"}</td><td >{"容易漏墨、要保養"}</td><td >{"墨耗得快"}</td><td >{"偶爾出墨結塊"}</td></tr>
<tr ><td >{"耐用度"}</td><td >{"字怕水"}</td><td >{"中等"}</td><td >{"最耐久 🏆"}</td></tr>
<tr ><td >{"適合場合"}</td><td >{"簽名、書法"}</td><td >{"筆記、日常"}</td><td >{"考試、文件、萬用"}</td></tr>
</tbody>
</table>
</div>
<div className="info-box good"><b >{"🎯 結論："}</b>{"不同場合用不同筆——沒有最好的筆，只有最適合的筆！"}</div>
<h3 className="block-title">{"油性筆為什麼不容易被水洗掉？"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/shirt-stain.webp"} alt="襯衫上的油性筆痕" loading="lazy" width={2500} height={1875} />
<div className="cap">{"慘劇現場：油性筆沾到衣服……"}</div>
</div>
<div >
<div className="info-box bad" style={{"marginTop": "0"}}>
<b >{"為什麼水洗不掉？"}</b><br  />{"\n                    油性筆遇到水不會暈開，因為裡面的溶劑是「油」，而"}<b >{"水和油不互溶"}</b>{"。另外油性筆的樹脂附著力強，一旦乾掉就像一層薄膜黏在表面。\n                "}</div>
<div className="info-box good">
<b >{"那怎麼辦？"}</b><br  />{"\n                    酒精分子能溶解油性墨水，也能把樹脂薄膜慢慢弄散——所以用酒精擦最有機會救回來！\n                "}</div>
</div>
</div>
<KnowledgeQuiz index={4} />
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"🔬"}</div>
<h2 >{"原子筆與墨水的科學"}</h2>
<span className="sec-tag">{"毛細現象 · 流量控制 · 色層分析"}</span>
</div>
<h3 className="block-title">{"毛細現象：墨水自己往筆尖跑"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/capillary.webp"} alt="棉繩把彩色水吸上來" loading="lazy" width={2500} height={1667} />
<div className="cap">{"吸管、紙巾、棉繩都能把水「吸」上去——這就是毛細現象"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/rainbow-towels.webp"} alt="紙巾彩虹橋" loading="lazy" width={2500} height={1667} />
<div className="cap">{"動手做：把紙巾浸一點彩色水，看水自己往上跑！"}</div>
</div>
</div>
<CapillaryRace />
<RainbowBridge />
<div className="info-box info">
<b >{"💡 關鍵理解："}</b>{"原子筆裡也有毛細現象，所以墨水會自動往筆尖跑，不需要用力擠。這也是為什麼原子筆"}<b >{"倒著寫會斷水"}</b>{"——毛細＋重力都幫不上忙了！（太空筆就是為了解決這個問題）\n        "}</div>
<h3 className="block-title">{"黑色墨水的祕密：色層分析（Chromatography）"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/chroma-petri.webp"} alt="濾紙上的色層分析" loading="lazy" width={2500} height={1667} />
<div className="cap">{"黑色墨水在濾紙上被水帶開後，跑出好多顏色！"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/chroma-layers.webp"} alt="顏色分層" loading="lazy" width={1651} height={2476} />
<div className="cap">{"不同染料分子大小不一樣、親水程度不一樣——跑得快慢不同，就分成一層一層"}</div>
</div>
</div>
<div className="info-box info">
<b >{"🖤 你知道嗎？"}</b>{"黑色墨水其實是很多種顏色混在一起！比較小、比較「喜歡水」的染料分子跟著水跑得快；比較大、比較「不喜歡水」的跑得慢——顏色就這樣被分開了。科學家還用同樣的方法分析食物色素、檢驗藥物成分呢！\n        "}</div>
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"✨"}</div>
<h2 >{"消失的墨水：故事與原理"}</h2>
</div>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/postman-story.webp"} alt="小小郵差與化學師的故事插圖" loading="lazy" width={2500} height={1667} />
<div className="cap">{"故事：小小郵差與會消失的字"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/secret-message.webp"} alt="Secret Message 隱形墨水" loading="lazy" width={1536} height={1024} />
<div className="cap">{"消失的墨水＝染料分子會「變身」的化學魔法"}</div>
</div>
</div>
<div className="info-box info">
<b >{"📖 小故事："}</b><br  />{"\n            很久以前，有個國家的郵差常常被敵人偷看信件。國王很苦惱，就請來一位化學師。化學師調配出一種魔法墨水：寫下去很清楚，但三個時辰後會慢慢消失，只剩下淡淡的影子。只有收信人知道秘密——把信放到溫暖的火爐旁，字就會像幽靈一樣重新浮出來！從此以後，只有真正的收件人才看得懂裡面的訊息。\n        "}</div>
<p style={{"fontSize": "16.5px", "color": "var(--ink-soft)"}}>{"消失的墨水，利用的是"}<b >{"「染料分子會改變」"}</b>{"的原理：有些顏料遇到"}<b >{"酸或鹼"}</b>{"會變色、褪色甚至變透明；有些則是氧化還原反應讓顏色被破壞掉。字跡不是真的不見，是分子「變身」了！"}</p>
<h3 className="block-title">{"🍋 加碼：在家就能玩的檸檬汁隱形墨水"}</h3>
<div className="photo-grid2">
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/lemon-ink.webp"} alt="檸檬汁隱形墨水" loading="lazy" width={2500} height={1667} />
<div className="cap">{"用棉花棒沾檸檬汁寫字，乾了就隱形"}</div>
</div>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/iron-reveal.webp"} alt="熨斗加熱顯字" loading="lazy" width={2500} height={1667} />
<div className="cap">{"請大人幫忙用熨斗加熱——字就浮現了！（加熱讓檸檬汁裡的糖分焦化變棕色）"}</div>
</div>
</div>
<div className="info-box warn">
<b >{"⚠️ 提醒："}</b>{"加熱步驟（熨斗、吹風機、燈泡）一定要請大人協助，注意燙傷風險。\n        "}</div>
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"🧪"}</div>
<h2 >{"課後實驗：百里酚酞變色魔法"}</h2>
<span className="sec-tag">{"Thymolphthalein 消失的墨水"}</span>
</div>
<div className="exp-banner">
<span className="big">{"🎩"}</span>
<span >{"三段魔法：鹼讓字「浮現」→ 酸讓字「消失」→ 學生自製的碳酸鈉讓字「復活」！"}</span>
</div>
<h3 className="block-title">{"準備材料"}</h3>
<div className="photo">
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/slide-materials.webp"} alt="實驗材料：氫氧化鈉、百里香酚酞、95%酒精、水、量筒、燒杯、棉花棒、紙" loading="lazy" width={1334} height={750} />
<div className="cap">{"氫氧化鈉、百里酚酞、95% 酒精、水、量筒、燒杯三個、棉花棒、紙（投影片 p.46）"}</div>
</div>
<h3 className="block-title">{"實驗原理（三合一）"}</h3>
<div className="grid3">
<div className="mini-card">
<div className="m-emoji">{"🌡️"}</div>
<div className="m-title">{"酸鹼指示劑"}</div>
<p >{"百里酚酞遇到鹼變"}<b style={{"color": "var(--info)"}}>{"藍色"}</b>{"，遇到酸或中性就"}<b >{"無色"}</b></p>
</div>
<div className="mini-card">
<div className="m-emoji">{"⚖️"}</div>
<div className="m-title">{"酸鹼中和"}</div>
<p >{"檸檬酸把鹼中和掉，pH 下降，藍色立刻消失"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🍶"}</div>
<div className="m-title">{"有機溶劑"}</div>
<p >{"百里酚酞"}<b >{"不溶於水"}</b>{"，要用 95% 酒精才溶得開"}</p>
</div>
</div>
<div className="ph-scale">
<div className="ph-bar"></div>
<div className="ph-labels">
<span >{"pH 低（酸性）：無色"}</span>
<span >{"pH ≈ 9.3～10.5 漸變"}</span>
<span >{"pH 高（強鹼）：藍色 💙"}</span>
</div>
</div>
<h3 className="block-title">{"藥品配方卡"}</h3>
<div className="recipe">
<div className="recipe-head teacher"><i className="fa-solid fa-user-shield"></i>{" 老師事先調配（安全考量）"}</div>
<div className="recipe-body">
<div className="recipe-item">
<div className="r-emoji">{"💙"}</div>
<div >
<div className="r-name">{"百里酚酞指示劑"}</div>
<span className="r-formula">{"95% 酒精 50 mL ＋ 百里酚酞 0.5 g"}</span>
<p >{"百里酚酞（Thymolphthalein）不溶於水，一定要用 95% 酒精溶解。"}</p>
</div>
</div>
<div className="recipe-item">
<div className="r-emoji">{"🧴"}</div>
<div >
<div className="r-name">{"氫氧化鈉（NaOH）水溶液"}</div>
<span className="r-formula">{"水 50 mL ＋ 50 mL（共 100 mL）配 NaOH 0.4 g"}</span>
<p >{"用"}<b >{"棉花棒"}</b>{"沾取書寫呈現，避免學生直接接觸強鹼。"}</p>
</div>
</div>
<div className="recipe-item">
<div className="r-emoji">{"🍋"}</div>
<div >
<div className="r-name">{"檸檬酸水溶液"}</div>
<span className="r-formula">{"水 100 mL 配 檸檬酸 8.4 g"}</span>
<p >{"「消字魔法水」——酸鹼中和的主角。"}</p>
</div>
</div>
</div>
</div>
<div className="recipe" style={{"marginTop": "14px"}}>
<div className="recipe-head student"><i className="fa-solid fa-children"></i>{" 學生動手操作"}</div>
<div className="recipe-body">
<div className="recipe-item">
<div className="r-emoji">{"🔥"}</div>
<div >
<div className="r-name">{"小蘇打水溶液 → 加熱 → 碳酸鈉水溶液"}</div>
<span className="r-formula">{"每組：水 50 mL ＋ 小蘇打 5 g"}</span>
<p >{"加熱後小蘇打（碳酸氫鈉）分解成"}<b >{"碳酸鈉"}</b>{"，鹼性變強——這就是學生自己做出來的「復活魔法水」！"}<br  />{"2NaHCO₃ → Na₂CO₃ ＋ H₂O ＋ CO₂↑"}</p>
</div>
</div>
</div>
</div>
<div className="info-box bad">
<b >{"⚠️ 安全提醒"}</b><br  />{"\n            ・NaOH 具腐蝕性：由老師調配與保管，學生僅用棉花棒沾取，全程配戴護目鏡，避免接觸皮膚與眼睛。"}<br  />{"\n            ・95% 酒精易燃：遠離火源，與加熱步驟分開區域操作。"}<br  />{"\n            ・加熱小蘇打水時使用安全加熱器材，小心蒸氣燙傷。"}<br  />{"\n            ・實驗結束確實洗手，溶液依規定回收。\n        "}</div>
</div>

<div className="section">
<div className="sec-head">
<div className="sec-icon">{"🏠"}</div>
<h2 >{"回家挑戰（延伸思考）"}</h2>
<span className="sec-tag">{"把科學帶回家"}</span>
</div>
<div className="grid3">
<div className="mini-card">
<div className="m-emoji">{"🔍"}</div>
<div className="m-title">{"觀察任務"}</div>
<p >{"找出家裡 3 支不同的筆，判斷它們是水性、中性還是油性？寫在紙上滴一滴水試試看！"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🌈"}</div>
<div className="m-title">{"實驗任務"}</div>
<p >{"用咖啡濾紙和黑色水性筆做色層分析，數數看你分出了幾種顏色？"}</p>
</div>
<div className="mini-card">
<div className="m-emoji">{"🍋"}</div>
<div className="m-title">{"魔法任務"}</div>
<p >{"用檸檬汁寫一封隱形信給家人，請大人幫忙加熱顯字！"}</p>
</div>
</div>
</div>
<footer >
<img src={import.meta.env.BASE_URL + "assets/images/magic-ink/logo-wall.webp"} alt="超知識 logo 牆" loading="lazy" width={859} height={532} />{"\n        超知識 SUPER SCIENCE KNOWLEDGE · 1143L1 神奇的墨水！原子筆的科學"}<br  />{"\n        40 分鐘課程懶人包 · 大耳狗教學網 · By Anita 老師\n    "}</footer>
</div>); }
