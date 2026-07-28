// ── 題庫 ──
// answer: true = 對(⭕) / false = 錯(❌)
const questions = [
    { q: "在學校的走廊上不可以用跑步的，因為萬一不小心撞到同學，兩個人都會受傷跌倒。", answer: true },
    { q: "剪刀和美工刀非常鋒利，拿來剪紙的時候要小心，絕對不可以用尖尖的刀尖對著同學。", answer: true },
    { q: "家裡的插座裡面有很危險的電，我們絕對不可以用自己的手指頭或鐵絲插進去玩耍。", answer: true },
    { q: "下大雨的時候出門，要記得撐傘或穿雨衣，身體才不會因為被雨淋濕而感冒生病。", answer: true },
    { q: "瓦斯爐上的湯滾了會非常燙，小朋友不可以因為好奇，就直接用手去摸熱熱的鍋子。", answer: true },
    { q: "剪刀是學校美勞課常常會用到的工具，因為它非常鋒利，所以傳給同學時應該把手把朝向對方。", answer: true },
    { q: "過馬路的時候，我們一定要走在白色的斑馬線上，並且注意左右有沒來車，這樣才安全。", answer: true },
    { q: "在圖書館裡面，為了讓大家都能專心看書，我們如果需要說話時一律都要輕聲細語。", answer: true },
    { q: "在教室裡如果看見地上有同學不小心掉落的鉛筆，我們應該要幫忙撿起來並詢問是誰掉的。", answer: true },
    { q: "下課時間如果想要和同學一起玩盪秋千，應該要遵守規矩在旁邊排隊，不可以用力推擠別人。", answer: true },
    { q: "當我們在學校看見同學不小心跌倒受傷了，我們應該要趕快去報告老師，或是扶同學去健康中心。", answer: true },
    { q: "當我們需要跟同學借用彩色筆或鉛筆的時候，一定要先開口詢問對方，得到同意後才能拿。", answer: true },
    { q: "在全台灣的所有學校裡，每個星期一到星期五都是要上學的日子，而週末兩天就是放假日。", answer: true },
    { q: "下課在操場踢足球的時候，如果不小心把球踢到校園外面的大馬路上，應該要請警衛叔叔幫忙撿。", answer: true },
    { q: "如果看見家裡的延長線上面已經密密麻麻插滿了各種電器的插頭，應該要提醒爸爸媽媽拔掉。", answer: true },
    { q: "馬路上的黃色網狀線區域是為了保持路口暢通設計的，所以任何汽車都絕對不可以在上面停下來。", answer: true },
    { q: "當發生大地震的時候，如果我們剛好在教室裡面，應該要立刻躲在桌子下面並保護好頭部。", answer: true },
    { q: "為了安全起見，我們絕對不能在客廳的沙發或小茶几上用力跳來跳去，因為很容易摔倒。", answer: true },
    { q: "走在路上如果看見地上有亮晶晶的碎玻璃，因為碎片非常鋒利，我們千萬不能用赤腳去踩它。", answer: true },
    { q: "如果看見馬路上的綠燈已經開始閃爍並且快要變成紅燈，我們應該要在路口停下來等待下一次綠燈。", answer: true },
    { q: "坐摩托車的時候，無論是騎車的大人還是坐在後面的小朋友，每個人都要戴好安全帽。", answer: true },
    { q: "如果不小心在百貨公司或大賣場和爸爸媽媽走散了，應該留在原地或是找穿制服的服務人員幫忙。", answer: true },
    { q: "在廚房裡看見媽媽剛用完的微波爐或烤箱，外面雖然看起來不紅，但表面可能很燙不能亂摸。", answer: true },
    { q: "我們在學校的遊戲場玩攀爬架的時候，雙手一定要緊緊抓牢，不可以在上面和同學推來推去。", answer: true },
    { q: "在客廳看電視時，如果發現電器的電線裂開或是冒出火花，要立刻大聲告訴家裡的大人。", answer: true },
    { q: "每次上完廁所之後，或是準備要吃美味的飯菜之前，我們都要記得用肥皂把雙手洗乾淨。", answer: true },
    { q: "如果常常躺著看書、或者是喜歡一邊走路一邊看書，這些壞習慣都很容易讓眼睛近視。", answer: true },
    { q: "當我們感冒打噴嚏或咳嗽的時候，應該要用自己的手肘或乾淨的衛生紙遮住口鼻。", answer: true },
    { q: "在日常生活中多吃新鮮的蔬菜和水果，可以讓大家上廁所大便的時候變得很順暢。", answer: true },
    { q: "每次吃完好吃的甜點或糖果之後，一定要趕快去漱口或刷牙，嘴巴才不會長出蛀牙。", answer: true },
    { q: "人類的指甲如果長得太長卻一直不剪掉，裡面就會藏很多我們眼睛看不見的髒髒細菌。", answer: true },
    { q: "如果一邊讓嘴巴含著食物、又一邊大聲跟同學說話，這樣一不小心很容易就會被噎到。", answer: true },
    { q: "如果我們每天都有早睡早起的好習慣，並且不吃宵夜，這樣通常會讓身體變得更有精神、更健康。", answer: true },
    { q: "當我們在學校吃完美味的午餐後，應該要養成用漱口水或刷牙的習慣，這樣才能保護牙齒不生病。", answer: true },
    { q: "每個人每天都應該要補充足夠的乾淨開水，這樣才能讓身體裡面的毒素順利排出體外。", answer: true },
    { q: "我們的手指甲如果長太長，在跟同學玩遊戲抓來抓去的時候，很容易會把同學的皮膚抓受傷。", answer: true },
    { q: "看電視的時候應該要保持適當的距離，並且每看三十分鐘就要讓眼睛休息十分鐘才好。", answer: true },
    { q: "每天晚上睡覺前要把書包和隔天要穿的制服整理好，這樣隔天早上上學時才不會慌慌張張。", answer: true },
    { q: "吃東西的時候要細嚼慢嚥，不可以把一大口麵包直接塞進嘴巴裡吞下去，這樣很容易噎到。", answer: true },
    { q: "每天放學回家之後，應該要先把聯絡簿拿給爸爸媽媽簽名，並且認真把當天的功課寫完。", answer: true },
    { q: "我們不可以把擦完大便的髒衛生紙直接扔在浴室地板上，應該丟進垃圾桶才不會發臭。", answer: true },
    { q: "小學生的課本和聯絡簿非常重要，平時要放在書包裡收好，不可以用彩色筆在上面亂塗亂畫。", answer: true },
    { q: "流汗之後如果不趕快用毛巾擦乾或是換乾淨的衣服，吹到冷氣時很容易會感冒流鼻水。", answer: true },
    { q: "我們不可以隨地亂吐口痰或亂丟口香糖，因為這樣不但很髒，還會把細菌傳染給別人。", answer: true },
    { q: "晚上睡覺前要把房間的玩具全部收拾好放回玩具箱，這樣半夜起床上廁所時才不會被絆倒。", answer: true },
    { q: "世界上所有人的指紋長得都不一樣，而且每個人手上的指紋都是獨一無二的。", answer: true },
    { q: "大西瓜切開來後，裡面會有很多黑色的子，那些黑色的子其實就是西瓜的種子。", answer: true },
    { q: "早上的太陽總是會從東邊的天空慢慢升起來，為大地帶來滿滿的光亮與熱呼呼的溫暖。", answer: true },
    { q: "小雞小時候是從圓圓的雞蛋裡面孵化出來的，而且牠們長大以後就會變成公雞或者母雞。", answer: true },
    { q: "蝸牛在走路的時候速度非常慢，而且牠們的背上會背著一個硬硬的殼來保護自己。", answer: true },
    { q: "秋天到了的時候，天氣會慢慢變得涼爽，很多大樹上的綠色葉子也會開始變成黃色並掉落。", answer: true },
    { q: "天空中美麗的彩虹通常會在下完大雨、太陽又出來的時候，悄悄出現在藍藍的天空上。", answer: true },
    { q: "大熊、青蛙和蛇在寒冷的冬天來臨時，因為外面找不到食物，所以會躲進洞穴裡冬眠睡覺。", answer: true },
    { q: "小企鵝雖然生活在冰天雪地的南極，而且牠們不會飛，但是牠們是厲害的游泳高手。", answer: true },
    { q: "把水放進製冰盒裡，再放到冰箱最上層的冷凍庫裡面，過幾天後水就會結冰變成冰塊。", answer: true },
    { q: "大樹的根會緊緊抓著泥土，並吸取地底下的水份，這樣大樹才能長得又高又大又強壯。", answer: true },
    { q: "鳥類的身上長滿了輕輕的羽毛，而且牠們大部分都擁有翅膀，可以在天空中自由地飛翔。", answer: true },
    { q: "天上的月亮在每個月初的時候看起來細細彎彎的，像香蕉一樣，到了月中就會變成大圓盤。", answer: true },
    { q: "小貓咪口渴的時候需要喝乾淨的開水，如果不小心讓牠們喝到不乾淨的髒水，小貓也會生病。", answer: true },
    { q: "向日葵是一種很有趣的植物，牠們的金色花朵在白天的時候，會喜歡朝著太陽的方向轉動。", answer: true },
    { q: "當家裡時鐘上的長針正好指著數字 12 的時候，就代表現在的時間正好是整點。", answer: true },
    { q: "如果把一個大西瓜從中間平分切成兩半，這兩半西瓜的大小和重量一定會一模一樣。", answer: true },
    { q: "數學形狀裡的正方形一共有 4 個角，而且還擁有 4 條一樣長的邊，長得端端正正的。", answer: true },
    { q: "一星期總共有 7 天的時間，其中我們最期待的週末假期就是星期六和星期天這兩天。", answer: true },
    { q: "我們在吃飯時，筷子通常都是 2 支一起拿來使用，所以可以用「一雙」來數筷子。", answer: true },
    { q: "我們把自己的兩隻手伸出來，仔細把所有的手指頭數一數，總共會有 10 根手指頭。", answer: true },
    { q: "如果我們把一個圓形的披薩從中間平分切成四個大小一樣的扇形，每一片的大小都會一模一樣。", answer: true },
    { q: "如果我們把紅色的彩色筆和黃色的彩色筆顏色混在一起，就可以在圖畫紙上調出美麗的橘色。", answer: true },
    { q: "我們平常穿在腳上的襪子，通常都是兩隻腳各穿一隻，所以我們可以用「一雙」來數襪子。", answer: true },
    { q: "小老鼠的體型看起來小小的，而大象的體型看起來非常巨大，這兩種動物的體型相差非常多。", answer: true },
    { q: "數字 6 倒過來看雖然長得很像數字 9，但是 6 顆蘋果和 9 顆蘋果的數量完全不一樣多。", answer: true },
    { q: "三角飯糰的形狀就像一個三角形，如果我們仔細數一數，它一共有 3 個尖尖的角。", answer: true },
    { q: "小明今年 7 歲，妹妹今年 5 歲，因為小明比妹妹大 2 歲，所以 3 年後小明依然比妹妹大 2 歲。", answer: true },
    { q: "一整年裡面一共有 12 個月，其中不論是哪一個月份，每一週都會有快樂的「星期日」。", answer: true },
    { q: "原子筆一枝如果需要 15 元，小華拿了一張 100 元的鈔票去買一枝，店員應該要找給他 85 元。", answer: true },
    { q: "把一個大西瓜平分切成兩半之後，切下來的每一半西瓜形狀都會變成半圓形而不是圓形。", answer: true },
    { q: "樹上有 5 隻小鳥，獵人開槍「砰！」的一聲打中 1 隻，其他小鳥受到驚嚇會立刻全部飛走。", answer: true },
    { q: "老師把 20 顆新鮮的草莓平分給 20 個小朋友，結果每個小朋友都只能剛好分到 1 顆草莓。", answer: true },
    { q: "如果我有 5 本故事書，借給同學 2 本之後，我自己的書包裡就還會剩下 3 本故事書。", answer: true },
    { q: "時鐘上面的短針如果是指著數字 3，而長針剛好指著數字 12，代表現在是下午 3 點整。", answer: true },
    { q: "每年的中秋節到的時候，大街小巷的小朋友最喜歡和家人一起吃圓圓的月餅和甜甜的柚子。", answer: true },
    { q: "台灣的四周都被藍藍的大海圍繞著，是一個風景非常美麗而且充滿人情味的島嶼。", answer: true },
    { q: "警察叔叔的工作是抓壞人、維持馬路上的交通安全，是全體人民最偉大的守護者。", answer: true },
    { q: "每年到了元宵節的時候，大家就會提著亮亮的燈籠，開心地去公園散步和看花燈。", answer: true },
    { q: "在公車或捷運上如果看見有年紀很大的老爺爺上車，我們應該要主動站起來把座位讓給他。", answer: true },
    { q: "郵差叔叔每天都穿著綠色的制服，他們最主要的工作是開著車幫大家把信件與包裹送到家。", answer: true },
    { q: "每年的元宵節到的時候，家家戶戶的小朋友最喜歡和家人一起吃熱騰騰的湯圓並提燈籠。", answer: true },
    { q: "當我們向別人拿東西或者是受到別人的幫忙時，要主動大聲說「謝謝」，這才是乖孩子。", answer: true },
    { q: "端午節是台灣重要的傳統節日，在這一天大家會聚在一起開心地吃美味的肉粽。", answer: true },
    { q: "在台灣，如果不小心在路上遇到壞人或者有人搶劫，可以立刻用電話撥打「110」請警察幫忙。", answer: true },
    { q: "在台灣的街道上，如果不小心看見有人家裡失火或是有人受傷，應該立刻撥打「119」求救。", answer: true },
    { q: "去便利商店買東西的時候，必須要把選好的零食拿到櫃檯排隊，付完錢之後才可以帶回家。", answer: true },
    { q: "學校舉行升旗典禮聽到國歌響起時，全體同學都應該要立正站好，專心向國旗敬禮才對。", answer: true },
    { q: "去醫院看病的時候為了不吵到其他生病休息的人，當醫生問話時，我們應該要小聲回答。", answer: true },
    { q: "清潔隊員每天晚上都會開著垃圾車幫大家收垃圾，他們是讓城市保持乾淨的重要英雄。", answer: true },
    { q: "在學校看到老師或者校長的時候，我們要主動停下腳步大聲打招呼說老師好，這很有禮貌。", answer: true },
    { q: "農曆新年是大家團圓的日子，小朋友在這一天會向長輩拜年，並且開心地拿紅包壓歲錢。", answer: true },
    { q: "去游泳池游泳或者是去海邊玩水的時候，身邊一定要有爸爸媽媽或大人看著才安全。", answer: true },
    { q: "馬路上的紅綠燈是交通的總指揮，紅燈代表停下來，綠燈代表可以安全地通過馬路。", answer: true },
    { q: "如果我們在路上撿到別人掉落的錢包，應該要立刻交給警察局或是學校的學務處才對。", answer: true },
    { q: "為了上課不遲到，過馬路時外面的交通很混亂，只要看到紅燈閃爍，就要用最快的速度衝過去。", answer: false },
    { q: "過馬路時只要旁邊看起來沒有車子，就算現在亮起的是紅燈，我們也可以直接跑過去。", answer: false },
    { q: "洗完熱水澡後，因為浴室的地板濕濕滑滑的，所以我們在浴室裡走路要用跑的才不會跌倒。", answer: false },
    { q: "吹風機是吹頭髮用的，所以洗完澡後，可以把它帶進滿滿都是水的浴缸裡一起玩。", answer: false },
    { q: "打火機可以點火很好玩，所以只要有大人在旁邊看著，小朋友就可以拿去房間燒紙玩。", answer: false },
    { q: "上下樓梯時要專心扶著扶手慢慢走，如果遇到快要上課鐘響，就可以閉著眼睛直接衝下去。", answer: false },
    { q: "延長線如果插滿了電器插頭，看起來就像大樹扎根一樣，會讓電器變得更有電力、更安全。", answer: false },
    { q: "地震發生時要趕快保護頭部，所以我們應該要立刻搭乘電梯，用最快的速度坐到一樓跑到外面。", answer: false },
    { q: "不小心打翻水在桌上時，因為衛生紙可以吸水，所以直接把智慧型手機泡進水裡也能幫手機洗澡。", answer: false },
    { q: "家裡冰箱的冷凍庫冰冰涼涼的，如果夏天覺得太熱，我們可以自己把身體躲進冷凍庫裡面消暑。", answer: false },
    { q: "媽媽在瓦斯爐上剛煮好的熱開水，我們可以直接把手伸進水壺裡，測試看看水到底有沒有燒開。", answer: false },
    { q: "在馬路上看見可愛的流浪貓或流浪狗，不管牠們想不想吃東西，我們都可以直接伸手去摸牠們的頭。", answer: false },
    { q: "我們在學校美勞課做完的手工剪刀，因為它太長了，可以直接放進口袋裡帶著在走廊跑步。", answer: false },
    { q: "如果在馬路上看到大卡車正在轉彎，因為大卡車開得很慢，我們可以從它旁邊的縫隙鑽過去。", answer: false },
    { q: "廚房裡的微波爐可以加熱很多東西，所以我們也可以把沒剝殼的整顆雞蛋放進去微波加熱。", answer: false },
    { q: "在游泳池玩憋氣遊戲很好玩，所以只要同學沒注意，我們就可以偷偷把同學的頭壓進水裡玩。", answer: false },
    { q: "如果家裡的電風扇在轉動時發出怪聲音，我們可以自己拿削鉛筆機的鐵絲伸進去把電風扇修好。", answer: false },
    { q: "在學校上課如果突然想去上廁所，因為不想打擾老師，我們可以不用報告就偷偷溜出教室。", answer: false },
    { q: "馬路上的地下道或施工圍籬看起來神祕又好玩，下課時我們可以和同學一起進去探險。", answer: false },
    { q: "如果看見家裡的鐵捲門正在慢慢關下來，我們要用最快的速度從鐵捲門下方爬過去才刺激。", answer: false },
    { q: "如果家裡的廚房突然傳出臭臭的瓦斯味，我們應該要趕快按下電燈開關，把廚房的燈打開檢查。", answer: false },
    { q: "在學校跟同學玩捉迷藏的時候，躲進頂樓停用的大型飲水機機箱或垃圾大圓桶裡是最安全的。", answer: false },
    { q: "放學回家如果發現鑰匙忘記帶，看到二樓的窗戶開著，我們可以自己順著外面的水管爬上去。", answer: false },
    { q: "如果夏天去溪邊烤肉覺得很熱，只要水看起來淺淺的，小朋友就可以自己跳下去游泳消暑。", answer: false },
    { q: "在外面如果看見有不認識的陌生叔叔給妳亮晶晶的糖果，只要他說是媽媽的朋友就可以拿。", answer: false },
    { q: "雖然我們的手上有很多看不見的細菌，但只要不吃飯、不摸食物，上完廁所後就不用急著洗手。", answer: false },
    { q: "因為用雙眼看書很容易讓眼睛近視，所以我們看書時應該要閉上一隻眼睛看，這樣才能保護視力。", answer: false },
    { q: "抹布是拿來擦桌子髒污的工具，所以當我們吃完飯發現嘴巴髒髒時，也可以拿抹布來擦嘴巴。", answer: false },
    { q: "當我們發現手掌髒髒的時候，只要用力在自己的衣服或褲子上拍一拍，雙手就會變得很乾淨。", answer: false },
    { q: "眼睛是我們看世界的重要器官，如果覺得眼睛癢癢的，我們可以用剛玩完泥土的手用力去揉它。", answer: false },
    { q: "橡皮擦的材質軟軟的，當我們在教室裡覺得肚子有點餓時，可以把它當成軟糖放進嘴巴裡咬。", answer: false },
    { q: "看電視或玩平板電腦的時候，為了看得更清楚，我們應該把臉貼在螢幕前面不到十公分的地方。", answer: false },
    { q: "因為原子筆寫錯字時可以用立可帶塗掉，所以就算畫在自己的皮膚或衣服上也能輕鬆洗乾淨。", answer: false },
    { q: "嘴巴裡的乳牙反正長大以後都會全部換掉，所以小時候長了蛀牙也完全不用理它、不用看醫生。", answer: false },
    { q: "因為感冒流鼻水很麻煩，所以我們可以用力把鼻涕吸回肚子裡，這樣就不用一直用衛生紙擦。", answer: false },
    { q: "洗臉的時候只要用清水隨便潑兩下就可以了，眼角的眼屎和耳朵後面的污垢不用特別洗乾淨。", answer: false },
    { q: "我們在學校的午餐時間，如果自己的湯匙掉到地上了，只要用手拍一拍就可以繼續拿來喝湯。", answer: false },
    { q: "挖鼻孔是一件很舒服的事情，所以我們隨時都可以用指甲尖尖的手指頭用力去挖鼻孔流血。", answer: false },
    { q: "小學生的身體長得很快，所以只要我們覺得口渴，就可以天天把可樂和奶茶當成開水來喝。", answer: false },
    { q: "既然每天早晚都要刷牙，那麼中午在學校吃完飯後，就絕對不可以再刷牙，否則牙齒會磨軟。", answer: false },
    { q: "指甲刀是剪指甲用的，所以我們也可以用自己的嘴巴和牙齒把長長的指甲狠狠咬斷。", answer: false },
    { q: "因為天天洗頭太麻煩了，所以小學生只要每個星期洗一次頭髮，頭皮就不會長頭蝨或發癢。", answer: false },
    { q: "棉花棒是拿來清潔耳朵的，所以我們可以把它深深地塞進耳朵最裡面用力掏，越深越好。", answer: false },
    { q: "在教室裡如果沒有衛生紙，我們可以偷偷把鼻涕擦在課桌椅的下面，這樣別人都看不到。", answer: false },
    { q: "因為剛買回來的新衣服看起來很乾淨，所以不用經過清洗，就可以直接拆開包裝穿在身上。", answer: false },
    { q: "廚房裡的糖和鹽巴長得很像，如果我們在煮熱可可時不小心加成鹽巴，喝起來就會變得更甜。", answer: false },
    { q: "夏天天氣非常炎熱，只要把開水倒進製冰盒再放進冰箱的冷凍庫，開水就會變成冰涼的水果冰棒。", answer: false },
    { q: "青蛙小時候住在水裡的名字叫做「蝌蚪」，等到牠們長大以後，身體就會長出長長的羽毛。", answer: false },
    { q: "魚類在水裡游泳游泳非常自由，是因為牠們跟人類一樣是用鼻子吸入外面的空氣來呼吸。", answer: false },
    { q: "仙人掌住在非常炎熱而且很少下雨的乾沙漠裡，所以牠們最喜歡每天被澆滿滿的水。", answer: false },
    { q: "大自然的太陽每天都是從西邊的大海升起，然後到了傍晚再從東邊的山頭落下去。", answer: false },
    { q: "蜘蛛是我們生活中常見的生物，牠們一共有 6 條腿，數量跟螞蟻、蝴蝶一模一樣。", answer: false },
    { q: "只要我們跑步的速度夠快，就可以在出大太陽的白天，成功把自己的影子遠遠甩掉。", answer: false },
    { q: "企鵝的身上長滿了黑白色的羽毛，屬於鳥類的一種，所以牠們非常擅長在天空中飛翔。", answer: false },
    { q: "大樹的葉子之所以看起來綠綠的，是因為大樹每天晚上都會偷偷吸收月亮的光芒。", answer: false },
    { q: "小狗在生氣想要咬人的時候，通常都會一邊汪汪大叫、一邊開心地拼命搖晃自己的尾巴。", answer: false },
    { q: "石頭和泥土雖然不會動，但是牠們也是有生命的，每天晚上都會和地上的小草聊天。", answer: false },
    { q: "西瓜、蘋果和草莓都是長在很高很大的高樹上，我們要爬梯子上去才能把它們摘下來。", answer: false },
    { q: "天空中的白雲軟綿綿的，就像我們在夜市裡吃到的棉花糖一樣，吃起來的味道甜滋滋的。", answer: false },
    { q: "月亮本身會發出非常強烈的金色光芒，把整個晚上的夜空照得跟白天一模一樣明亮。", answer: false },
    { q: "小鳥因為要生蛋所以有翅膀，而蝙蝠也是從圓圓的蛋裡面孵化出來的一種美麗鳥類。", answer: false },
    { q: "向日葵之所以叫做向日葵，是因為牠們只有在陰天或下雨天的時候，才會把花朵綻放開來。", answer: false },
    { q: "烏龜的殼雖然重重的，但是當牠們覺得很累的時候，可以隨時把殼脫下來放在地上睡覺。", answer: false },
    { q: "胡蘿蔔是長在泥土外面的大樹上，所以農夫叔叔在採收時，都要拿長長的竹竿去敲打它。", answer: false },
    { q: "海水吃起來是甜甜的，就像加了蜂蜜一樣，所以去海邊玩水時可以盡情大口喝海水。", answer: false },
    { q: "把白色和紅色的彩色筆顏色混在一起，圖畫紙上原本白色的地方會變成漂亮的綠色。", answer: false },
    { q: "冰淇淋冰冰涼涼的，所以把它放進熱熱的湯麵裡，因為溫度很高，冰淇淋絕對不會融化。", answer: false },
    { q: "冬天覺得天氣好冷的時候，故意不穿外套直接跑到外面吹冷風，這樣身體會變得更暖和。", answer: false },
    { q: "微波爐在加熱食物時會發光，所以我們可以把臉貼在微波爐的玻璃門上一直盯著看。", answer: false },
    { q: "因為鉛筆寫錯字時可以用橡皮擦擦掉，所以用原子筆寫錯字時，也可以用同一塊橡皮擦輕鬆擦乾淨。", answer: false },
    { q: "鉛筆寫錯字的時候，只要用手掌在紙上用力擦一擦，字就會像變魔術一樣完全消失。", answer: false },
    { q: "數字 10 比數字 5 還要小，所以 10 顆糖果比 5 顆糖果還要少。", answer: false },
    { q: "把 0 顆雞蛋放進原本空空的籃子裡，代表籃子裡現在裝了滿滿的雞蛋。", answer: false },
    { q: "如果我有 3 顆蘋果，媽媽再送我 2 顆，我手上的蘋果總共就會變成 10 顆。", answer: false },
    { q: "時鐘上有長針和短針，當兩支針同時指著數字 12 的時候，代表現在是下午 5 點整。", answer: false },
    { q: "正方形有 4 個直直的角，那麼比它少 1 個角的三角形，就會有 2 個角。", answer: false },
    { q: "一整年裡面一共有 12 個月，其中只有 1 月、2 月、3 月這三個月份有「星期日」。", answer: false },
    { q: "一枝原子筆要 15 元，小華拿了一張 100 元的鈔票去買一枝，店員應該要找給他 115 元。", answer: false },
    { q: "一個圓形的蛋糕無論用刀子平分切成多少片，每一片切下來的形狀都還是圓形的。", answer: false },
    { q: "我們的手指頭一隻手有 5 根，所以把雙手和雙腳的腳趾頭全部加起來一共有 15 根。", answer: false },
    { q: "當家裡時鐘上的短針和長針剛好連成一條直線，指著數字 6 和 12 時，代表現在是 3 點鐘。", answer: false },
    { q: "如果把一張正方形的紙張從中間對折一次，折出來的新形狀一定會變成美麗的圓形。", answer: false },
    { q: "一個星期總共有 5 天的時間，因為我們星期六和星期天都不用去學校上課。 ", answer: false },
    { q: "數字 0 比數字 1 還要大，所以如果我有 0 顆草莓，代表我比有 1 顆草莓的同學還要多。", answer: false },
    { q: "時鐘上的長針是用來數小時的，它走得非常慢，每隔一個小時才會動一格。 ", answer: false },
    { q: "垃圾倒進垃圾桶就好，鋁箔包和紙盒不用辛苦壓扁，直接整包丟進去裡面比較省時間。", answer: false },
    { q: "去便利商店買東西的時候，可以直接把喜歡的零食拿走，不需要到櫃檯給店員錢。", answer: false },
    { q: "郵差叔叔每天騎著摩托車，在社區裡辛苦送信，他主要的工作是幫大家去海邊釣魚。", answer: false },
    { q: "在公車或捷運上看到老爺爺或孕婦阿姨，因為我們年紀小，所以絕對不可以讓座給他們。", answer: false },
    { q: "升旗典禮聽到國歌響起時，我們可以一邊大聲跟同學聊天、一邊吃著手上的早餐。", answer: false },
    { q: "中秋節是重要的春季節日，大家在春暖花開的時候會一起去山上採草莓。", answer: false },
    { q: "端午節是台灣重要的傳統節日，在這一天大家會聚在一起開心地一邊吃月餅、一邊划龍舟。", answer: false },
    { q: "消防車出任務時會一邊閃燈一邊鳴笛，馬路上的車子聽到後都要趕快加速開在它前面幫它開路。", answer: false },
    { q: "去醫院看病時要保持安靜，所以當醫生叔叔問我們哪裡不舒服時，我們要緊緊閉上嘴巴不能說話。", answer: false },
    { q: "便利商店應有盡有，所以只要我們肚子餓了，就可以直接在店裡把茶葉蛋吃完後，再去櫃檯付錢。", answer: false },
    { q: "郵差叔叔全身都穿著綠色的制服，他們每天辛苦工作，主要目的是幫大家把熱騰騰的外賣便當送到家。", answer: false },
    { q: "去圖書館看書或借書時，為了不打擾到別的小朋友，我們在裡面可以和同學大聲聊天、玩捉迷藏。", answer: false },
    { q: "坐汽車時，坐在前面開車的人必須繫安全帶，後座的小朋友因為有前座擋著，所以不用繫安全帶。", answer: false },
    { q: "垃圾車來的時候會播放好聽的音樂，我們應該把手上的資源回收物和一般垃圾全部混在一起直接丟進去。", answer: false },
    { q: "向同學借彩色彩筆或橡皮擦等文具時，如果同學剛好不在座位上，我們可以直接拿走不用說。", answer: false },
    { q: "每年的端午節到的時候，大街小巷的許多家庭都會在門口掛上亮亮的燈籠並開心地吃月餅。", answer: false },
    { q: "警察叔叔平時的工作非常輕鬆，每天只要坐在辦公室裡一邊吃著冰淇淋、一邊看電視就可以了。", answer: false },
    { q: "每年的中秋節這一天，全台灣的小朋友都要在桌上擺滿康乃馨花朵，並向媽媽大聲說情人節快樂。", answer: false },
    { q: "馬路上的黃色網狀線區域非常寬敞，當前面塞車時，我們可以把車子剛好停在網狀線中間休息。", answer: false },
    { q: "在公車上如果不小心坐過站了，我們可以立刻用力拍打車窗，或是大聲跟司機叔叔吵架吵鬧。", answer: false }
];

// 洗牌：每次開始隨機打亂題目順序
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

let TIME_LIMIT = 3;                   // 每題秒數（開始前由使用者設定）
const RING_CIRC = 2 * Math.PI * 42;   // 進度環周長

let gameQuestions = [];               // 本輪要玩的題目（由題庫隨機抽出）
let currentQ = 0;
let timer = null;
let timeLeft = TIME_LIMIT;

// 題數輸入上限 = 題庫總數
document.getElementById('count-input').max = questions.length;
document.getElementById('count-hint').innerText = `可輸入 1～${questions.length} 題`;

function loadQuestion() {
    const q = gameQuestions[currentQ];

    document.getElementById('progress-label').innerText = `第 ${currentQ + 1} 題 / 共 ${gameQuestions.length} 題`;
    document.getElementById('progress-fill').style.width = `${(currentQ / gameQuestions.length) * 100}%`;
    document.getElementById('question-text').innerText = q.q;

    // 隱藏答案與下一題按鈕、顯示計時器
    document.getElementById('answer-reveal').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('timer-ring').classList.remove('done');

    startTimer();
}

function startTimer() {
    const ringFg = document.getElementById('ring-fg');
    const ringNum = document.getElementById('ring-num');
    const ring = document.getElementById('timer-ring');

    timeLeft = TIME_LIMIT;
    ring.classList.remove('urgent');
    ringNum.innerText = timeLeft;

    // 進度環：滿格 → 每秒縮短
    ringFg.style.strokeDasharray = RING_CIRC;
    ringFg.style.transition = 'none';
    ringFg.style.strokeDashoffset = 0;
    void ringFg.offsetWidth; // 觸發 reflow 重置動畫
    ringFg.style.transition = 'stroke-dashoffset 1s linear, stroke 0.3s ease';
    tickRing();

    timer = setInterval(() => {
        timeLeft--;
        ringNum.innerText = Math.max(timeLeft, 0);
        if (timeLeft <= 1) ring.classList.add('urgent');
        tickRing();
        if (timeLeft <= 0) {
            clearInterval(timer);
            revealAnswer();
        }
    }, 1000);
}

function tickRing() {
    const ringFg = document.getElementById('ring-fg');
    const elapsed = TIME_LIMIT - timeLeft;
    ringFg.style.strokeDashoffset = RING_CIRC * (elapsed / TIME_LIMIT);
}

// 時間到，公布答案
function revealAnswer() {
    const q = gameQuestions[currentQ];

    document.getElementById('timer-ring').classList.add('done');

    const badge = document.getElementById('answer-badge');
    const icon = document.getElementById('badge-icon');
    const word = document.getElementById('answer-word');

    if (q.answer) {
        badge.className = 'answer-badge is-true';
        icon.className = 'fa-solid fa-circle-check';
        word.innerText = '對 (True)';
    } else {
        badge.className = 'answer-badge is-false';
        icon.className = 'fa-solid fa-circle-xmark';
        word.innerText = '錯 (False)';
    }

    document.getElementById('answer-reveal').classList.remove('hidden');

    const nextBtn = document.getElementById('next-btn');
    nextBtn.innerHTML = (currentQ === gameQuestions.length - 1)
        ? '完成 <i class="fa-solid fa-flag-checkered"></i>'
        : '下一題 <i class="fa-solid fa-arrow-right"></i>';
    nextBtn.classList.remove('hidden');
}

function nextQuestion() {
    currentQ++;
    if (currentQ >= gameQuestions.length) {
        showResult();
    } else {
        loadQuestion();
    }
}

function showResult() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.querySelector('#result-screen .result-sub').innerText =
        `${gameQuestions.length} 題都答完囉，做得好！`;
    document.getElementById('result-screen').classList.remove('hidden');
}

// 快速選項按鈕：填入預設秒數
function setTime(sec) {
    document.getElementById('time-input').value = sec;
}

// 快速選項按鈕：填入預設題數
function setCount(n) {
    document.getElementById('count-input').value = Math.min(n, questions.length);
}

// 讀取設定並開始遊戲
function startGame() {
    const input = document.getElementById('time-input');
    let sec = parseInt(input.value, 10);
    if (isNaN(sec) || sec < 1) sec = 1;
    if (sec > 60) sec = 60;
    input.value = sec;
    TIME_LIMIT = sec;

    const countInput = document.getElementById('count-input');
    let count = parseInt(countInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > questions.length) count = questions.length;
    countInput.value = count;

    currentQ = 0;
    shuffle(questions);
    gameQuestions = questions.slice(0, count);
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    loadQuestion();
}

// 遊戲進行中：回到秒數設定畫面（停止計時）
function backToSetup() {
    clearInterval(timer);
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

// 再玩一次：回到設定畫面，可重新調整秒數
function restartQuiz() {
    backToSetup();
}
