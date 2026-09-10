/* 字尾大分流 · 遊戲邏輯
   ------------------------------------------------------------------
   讀 word-sort-pools.js 定義的全域 WORD_SORT_POOLS（載入順序不能顛倒）。

   這個遊戲要教兩件事，程式結構刻意跟著這兩件事走：

   1. 陣列 —— 全域只有三個陣列：queue（待作答）、fulArr、lessArr（已分類）。
      每答一題就是 queue.shift() 之後 push 進其中一個籃子，
      而且這三個陣列的長度隨時顯示在畫面上。
      遊戲結束的條件不是計時器歸零，是 queue.length === 0，
      這樣「陣列空了」本身就是一件學生看得見的事。

   2. 字串結合 —— 完整單字從來沒有存在資料裡，一律 item.stem + item.suffix
      當場算出來（見 wordOf）。畫面上那個虛線格子滑過去黏住字根的動畫，
      演的就是這一行程式。

   觸控電視注意事項：
   - 點擊底部大按鈕是主要操作，拖曳卡片是附加的。觸控電視的拖曳延遲常常
     很明顯，不能當成唯一入口。
   - 揭曉答案時整個舞台可以點，用來跳過等待 —— 老師帶全班時節奏自己抓。
   ------------------------------------------------------------------ */

(function () {
    'use strict';

    /* ---------- 可調參數 ---------- */
    var ROUND_SIZE = 12;      /* 一局幾題。題庫比這個少就全部拿來用 */
    var MERGE_DELAY = 280;    /* 字尾填進格子後，隔多久「黏」上字根 */
    var HOLD_CORRECT = 900;   /* 答對後停留多久 */
    var HOLD_WRONG = 2100;    /* 答錯要多一點時間看正解 */
    var HOLD_NOTE = 1500;     /* 有 note 的題目再多停這麼久 */
    var SWIPE_RATIO = 0.12;   /* 甩出去要超過螢幕寬度的幾成才算數 */

    /* ---------- DOM ---------- */
    var $ = function (id) { return document.getElementById(id); };

    var screenStart = $('screen-start');
    var screenPlay = $('screen-play');
    var screenResult = $('screen-result');
    var poolPicker = $('pool-picker');
    var stage = $('stage');
    var card = $('card');
    var wStem = $('w-stem');
    var wSlot = $('w-slot');
    var cardStemZh = $('card-stem-zh');
    var cardDef = $('card-def');
    var cardNote = $('card-note');
    var queueChips = $('queue-chips');
    var queueLen = $('queue-len');
    var statRight = $('stat-right');
    var statWrong = $('stat-wrong');
    var statTimer = $('stat-timer');
    var timerNum = $('timer-num');
    var hintLeft = $('hint-left');
    var hintRight = $('hint-right');
    var zoneFul = $('zone-ful');
    var zoneLess = $('zone-less');
    var collFul = $('coll-ful');
    var collLess = $('coll-less');
    var lenFulLive = $('len-ful-live');
    var lenLessLive = $('len-less-live');

    /* ---------- 狀態 ---------- */
    var queue = [];       /* 待作答，永遠從 [0] 開始出題 */
    var fulArr = [];      /* 分到 -ful 的完整單字 */
    var lessArr = [];     /* 分到 -less 的完整單字 */
    var wrongList = [];   /* 答錯的題目，結算時複習用 */
    var rightCount = 0;
    var locked = false;   /* 揭曉動畫期間擋住重複作答 */
    var poolName = '';
    var startTime = 0;
    var timerId = null;
    var advanceTimer = null;

    /* 字串結合就發生在這一行 —— 完整單字不存資料，每次現算 */
    function wordOf(item) {
        return item.stem + item.suffix;
    }

    /* ---------- 開始畫面 ---------- */

    function buildPoolPicker() {
        var pools = window.WORD_SORT_POOLS || {};
        poolPicker.innerHTML = '';

        Object.keys(pools).forEach(function (name) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pool-btn';

            var title = document.createElement('span');
            title.textContent = name;

            var count = document.createElement('span');
            count.className = 'pool-count';
            var total = pools[name].length;
            count.textContent = total > ROUND_SIZE
                ? ('共 ' + total + ' 字 · 隨機抽 ' + ROUND_SIZE + ' 題')
                : ('共 ' + total + ' 題');

            btn.appendChild(title);
            btn.appendChild(count);
            btn.addEventListener('click', function () { startRound(name); });
            poolPicker.appendChild(btn);
        });
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /* 抽題。兩件事要顧：

       ① **-ful 與 -less 各抽一半。** 題庫本身是偏的 —— 三四年級是 11 個
          -ful 對 20 個 -less，因為最好懂的那幾個 -ful（painful、joyful、
          playful）剛好都是紙本學習單教過、這裡刻意排除的字。純隨機抽的話
          平均會抽到 4 個 -ful 配 8 個 -less，**學生只要一路按 -less 就有
          六成分數**，整個遊戲就白做了。各半才逼他每題都得真的判斷。

       ② 同一個字根不要連著出現。對比組同字根有兩題（careful / careless），
          連著出現的話看前一題就知道後一題的答案。 */
    function drawQueue(pool) {
        var half = Math.floor(ROUND_SIZE / 2);
        var ful = shuffle(pool.filter(function (i) { return i.suffix === 'ful'; }));
        var less = shuffle(pool.filter(function (i) { return i.suffix === 'less'; }));

        var picked = ful.slice(0, half).concat(less.slice(0, ROUND_SIZE - half));

        /* 某一邊的字不夠湊滿一半，就從另一邊補足題數 */
        if (picked.length < ROUND_SIZE) {
            var rest = ful.slice(half).concat(less.slice(ROUND_SIZE - half));
            picked = picked.concat(
                shuffle(rest).slice(0, ROUND_SIZE - picked.length)
            );
        }

        picked = shuffle(picked);

        for (var i = 1; i < picked.length; i++) {
            if (picked[i].stem !== picked[i - 1].stem) continue;
            for (var j = i + 1; j < picked.length; j++) {
                if (picked[j].stem !== picked[i].stem) {
                    var t = picked[i]; picked[i] = picked[j]; picked[j] = t;
                    break;
                }
            }
        }
        return picked;
    }

    function startRound(name) {
        poolName = name;
        var pool = (window.WORD_SORT_POOLS || {})[name] || [];

        queue = drawQueue(pool);
        fulArr = [];
        lessArr = [];
        wrongList = [];
        rightCount = 0;
        locked = false;

        statRight.textContent = '0';
        statWrong.textContent = '0';
        renderCollected(null);

        screenStart.classList.add('hidden');
        screenResult.classList.add('hidden');
        screenPlay.classList.remove('hidden');
        document.body.classList.add('playing');

        /* 趁還沒開始計時，先把 Pixi 初始化掉，
           免得第一次答對才在那邊 parse 818 KB。 */
        if (window.WordSortFX) window.WordSortFX.warm();

        startTime = Date.now();
        statTimer.classList.remove('urgent');
        tickTimer();
        timerId = setInterval(tickTimer, 500);

        renderQueueHud();
        renderQuestion();
    }

    function tickTimer() {
        var s = Math.floor((Date.now() - startTime) / 1000);
        timerNum.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }

    /* ---------- 出題 ---------- */

    function renderQueueHud() {
        queueChips.innerHTML = '';
        /* 只畫得下的部分，多的靠 overflow 裁掉 —— 反正是提示不是主體 */
        var show = Math.min(queue.length, 10);
        for (var i = 0; i < show; i++) {
            var chip = document.createElement('div');
            chip.className = 'chip' + (i === 0 ? ' head' : '');

            var idx = document.createElement('span');
            idx.className = 'chip-i';
            idx.textContent = '[' + i + ']';

            var txt = document.createElement('span');
            /* 只露字根，不露答案 */
            txt.textContent = queue[i].stem;

            chip.appendChild(idx);
            chip.appendChild(txt);
            queueChips.appendChild(chip);
        }
        queueLen.textContent = queue.length;
    }

    function renderQuestion() {
        var item = queue[0];
        if (!item) { finish(); return; }

        card.className = 'card';
        card.style.transform = '';
        card.style.opacity = '';

        cardStemZh.textContent = item.stemZh;
        wStem.textContent = item.stem;
        wSlot.className = 'w-slot';
        wSlot.textContent = '?';
        cardDef.textContent = item.def;
        cardNote.className = 'card-note hidden';
        cardNote.textContent = '';

        zoneFul.disabled = false;
        zoneLess.disabled = false;
        setArmed(null);

        /* 佇列 HUD 不在這裡重畫 —— 它由 shiftQueue() 的動畫負責，
           在這裡再畫一次會把還沒跑完的遞補動畫洗掉。 */
        locked = false;
    }

    /* ---------- 收集籃：兩個看得見的陣列 ---------- */

    function paintArray(box, arr, lenEl, animateLast) {
        box.innerHTML = '';

        if (!arr.length) {
            var empty = document.createElement('span');
            empty.className = 'coll-empty';
            empty.textContent = '[ 還是空的 ]';
            box.appendChild(empty);
        } else {
            arr.forEach(function (w, i) {
                var el = document.createElement('span');
                el.className = 'coll-item'
                    + (animateLast && i === arr.length - 1 ? ' pop' : '');

                var idx = document.createElement('span');
                idx.className = 'ci-i';
                idx.textContent = '[' + i + ']';

                var word = document.createElement('span');
                word.className = 'ci-w';
                word.textContent = w;

                el.appendChild(idx);
                el.appendChild(word);
                box.appendChild(el);
            });
        }

        lenEl.textContent = arr.length;
    }

    /* newSide 有值時，那一邊剛加進去的元素會彈進來 */
    function renderCollected(newSide) {
        paintArray(collFul, fulArr, lenFulLive, newSide === 'ful');
        paintArray(collLess, lessArr, lenLessLive, newSide === 'less');
    }

    /* ---------- 作答 ---------- */

    function answer(chosen) {
        if (locked) return;
        var item = queue[0];
        if (!item) return;

        locked = true;
        zoneFul.disabled = true;
        zoneLess.disabled = true;
        setArmed(null);

        var isRight = (chosen === item.suffix);
        var word = wordOf(item);

        /* 不論對錯，籃子裡放的都是正確答案 ——
           陣列的內容必須是真的，錯的是分數不是資料。 */
        if (item.suffix === 'ful') fulArr.push(word);
        else lessArr.push(word);

        if (isRight) {
            rightCount++;
            statRight.textContent = rightCount;
        } else {
            wrongList.push({ word: word, def: item.def, chosen: chosen, right: item.suffix });
            statWrong.textContent = wrongList.length;
        }

        /* 卡片回正，準備演字串結合 */
        card.classList.add('settling');
        card.style.transform = '';

        /* 第一步：正確的字尾填進虛線格子 */
        wSlot.textContent = item.suffix;
        wSlot.className = 'w-slot filled ' + item.suffix;
        card.classList.add(isRight ? 'correct' : 'wrong');

        /* 第二步：格子滑過去黏住字根 —— stem + suffix 就在這一刻完成 */
        setTimeout(function () { wSlot.classList.add('merged'); }, MERGE_DELAY);

        var hold = isRight ? HOLD_CORRECT : HOLD_WRONG;

        if (!isRight) {
            cardNote.className = 'card-note';
            cardNote.textContent = '正解是 -' + item.suffix + '　'
                + item.stem + ' + ' + item.suffix + ' = ' + word;
        }
        if (item.note) {
            cardNote.className = 'card-note tip';
            cardNote.textContent = (isRight ? '' : '正解是 -' + item.suffix + '。') + item.note;
            hold += HOLD_NOTE;
        }

        /* 剛拼好的單字掉進它該去的陣列，帶著自己的索引彈出來 */
        renderCollected(item.suffix);

        if (isRight) celebrate(item.suffix);

        advanceTimer = setTimeout(advance, hold);
    }

    /* 揭曉期間點畫面可以直接跳下一題，老師帶全班時節奏自己控制 */
    function skipHold() {
        if (!locked || !advanceTimer) return;
        clearTimeout(advanceTimer);
        advanceTimer = null;
        advance();
    }

    function advance() {
        advanceTimer = null;

        /* 卡片飛向它該去的那一籃 */
        var item = queue[0];
        var dir = (item && item.suffix === 'ful') ? -1 : 1;
        card.classList.add('settling');
        card.style.transform = 'translateX(' + (dir * 130) + '%) rotate(' + (dir * 12) + 'deg)';
        card.style.opacity = '0';

        shiftQueue(function () {
            if (queue.length === 0) { finish(); return; }
            card.classList.remove('settling');
            renderQuestion();
        });
    }

    /* queue.shift() 的動畫版。
       ------------------------------------------------------------
       刻意拆成兩個看得懂的步驟：
         ① [0] 往上飛走          —— 頭被拿走了
         ② 後面全體往前遞補，
            而且索引當場重新編號 —— 這才是 shift() 真正做的事

       第二步用 FLIP：先重畫讓每個 chip 落到最終位置，量出位移，
       再把它們拉回舊位置、放開，讓瀏覽器自己補間。
       比自己逐格算座標穩，chip 寬度不一也不會算錯。 */
    function shiftQueue(done) {
        var chips = Array.prototype.slice.call(queueChips.children);
        if (!chips.length) {
            queue.shift();
            renderQueueHud();
            done();
            return;
        }

        chips[0].classList.add('leaving');

        setTimeout(function () {
            /* First：倖存者現在在哪裡 */
            var before = chips.slice(1).map(function (c) {
                return c.getBoundingClientRect().left;
            });

            queue.shift();          /* ← 陣列真的從頭部被拿走一個 */
            renderQueueHud();       /* Last：重畫，索引全部重新編號 */

            /* Invert：拉回舊位置 */
            var now = Array.prototype.slice.call(queueChips.children);
            now.forEach(function (c, i) {
                if (i >= before.length) return;
                var dx = before[i] - c.getBoundingClientRect().left;
                if (!dx) return;
                c.style.transition = 'none';
                c.style.transform = 'translateX(' + dx + 'px)';
            });

            void queueChips.offsetWidth;   /* 強制 reflow，否則兩次設定會被合併 */

            /* Play：放開，滑到新位置 */
            now.forEach(function (c) {
                c.style.transition = 'transform .34s cubic-bezier(.2, .8, .3, 1)';
                c.style.transform = '';
            });

            /* 索引數字閃一下，讓「編號變了」這件事被看見 */
            Array.prototype.forEach.call(
                queueChips.querySelectorAll('.chip-i'),
                function (el) { el.classList.add('renumber'); }
            );

            done();
        }, 260);
    }

    /* 彩帶從卡片的左右兩側往外噴，不從正中央。
       從中央噴的話，粒子頭幾幀會蓋住剛剛拼好的那個單字 ——
       而那正是整個遊戲最該被看見的一瞬間。往外噴變成「框住」它。 */
    function celebrate(suffix) {
        if (!window.WordSortFX) return;

        var r = card.getBoundingClientRect();
        var y = r.top + r.height * 0.5;
        var colors = suffix === 'ful'
            ? [0xd98026, 0xe8c34a, 0xf0a35a, 0xffffff]
            : [0x3f7fb5, 0x7fb2dc, 0x2e8b5e, 0xffffff];

        /* 螢幕座標的 y 是往下增加的，所以「往上」是負角度。
           左上 = -0.85π（cos 負、sin 負）；右上 = -0.15π（cos 正、sin 負）。 */
        window.WordSortFX.burst(r.left + 8, y, {
            count: 55, power: 14, spread: Math.PI * 0.9,
            angle: -Math.PI * 0.85, colors: colors
        });
        window.WordSortFX.burst(r.right - 8, y, {
            count: 55, power: 14, spread: Math.PI * 0.9,
            angle: -Math.PI * 0.15, colors: colors
        });
    }

    /* ---------- 拖曳 ---------- */

    var dragging = false;
    var dragStartX = 0;
    var dragDx = 0;

    function setArmed(side) {
        zoneFul.classList.toggle('armed', side === 'ful');
        zoneLess.classList.toggle('armed', side === 'less');
        hintLeft.classList.toggle('show', side === 'ful');
        hintRight.classList.toggle('show', side === 'less');
    }

    function threshold() {
        return window.innerWidth * SWIPE_RATIO;
    }

    card.addEventListener('pointerdown', function (e) {
        if (locked) { skipHold(); return; }
        dragging = true;
        dragStartX = e.clientX;
        dragDx = 0;
        card.classList.remove('settling');
        /* 某些觸控驅動送來的 pointerId 會被判定為無效而丟例外。
           沒包起來的話整個 pointerdown 處理器會中斷，拖曳從此失效。 */
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });

    card.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        dragDx = e.clientX - dragStartX;
        card.style.transform = 'translateX(' + dragDx + 'px) rotate(' + (dragDx * 0.025) + 'deg)';
        if (Math.abs(dragDx) > threshold()) {
            setArmed(dragDx < 0 ? 'ful' : 'less');
        } else {
            setArmed(null);
        }
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try { card.releasePointerCapture(e.pointerId); } catch (err) {}

        if (Math.abs(dragDx) > threshold()) {
            answer(dragDx < 0 ? 'ful' : 'less');
        } else {
            /* 沒甩夠遠，彈回原位 */
            card.classList.add('settling');
            card.style.transform = '';
            setArmed(null);
        }
    }

    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);

    /* 揭曉期間點舞台空白處也能跳過 */
    stage.addEventListener('click', function () { skipHold(); });

    /* ---------- 兩個大靶區 ---------- */

    zoneFul.addEventListener('click', function () { answer('ful'); });
    zoneLess.addEventListener('click', function () { answer('less'); });

    /* ---------- 結算 ---------- */

    /* 這裡刻意不再展示一次陣列 —— 陣列在遊玩過程中已經被看見了
       （上方的佇列、下方兩個收集籃）。只在結算畫面秀一段程式碼，
       那不叫教、那叫宣布。這頁只留成績和答錯的字。 */
    function finish() {
        clearInterval(timerId);
        timerId = null;
        document.body.classList.remove('playing');

        var total = rightCount + wrongList.length;
        var seconds = Math.floor((Date.now() - startTime) / 1000);

        $('result-title').textContent = wrongList.length === 0 ? '全部答對！' : '分完了！';
        $('result-score').innerHTML = '答對 <b>' + rightCount + '</b> / ' + total
            + ' 題　·　用時 ' + Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2)
            + '　·　' + poolName;

        var review = $('review-box');
        review.innerHTML = '';
        wrongList.forEach(function (w) {
            var div = document.createElement('div');
            div.className = 'review-item';
            div.innerHTML = '<span class="rv-word">' + w.word + '</span>'
                + '<span class="rv-def">' + w.def + '（你選了 -' + w.chosen + '）</span>';
            review.appendChild(div);
        });

        screenPlay.classList.add('hidden');
        screenResult.classList.remove('hidden');

        /* 全對才放大煙火，不然這個效果會廉價掉 */
        if (wrongList.length === 0 && window.WordSortFX) {
            [0.25, 0.5, 0.75].forEach(function (fx, i) {
                setTimeout(function () {
                    window.WordSortFX.burst(window.innerWidth * fx, window.innerHeight * 0.42, {
                        count: 90, power: 17
                    });
                }, i * 180);
            });
        }
    }

    /* ---------- 其他按鈕 ---------- */

    $('quit-btn').addEventListener('click', function () {
        clearInterval(timerId);
        clearTimeout(advanceTimer);
        timerId = null;
        advanceTimer = null;
        document.body.classList.remove('playing');
        if (window.WordSortFX) window.WordSortFX.clear();
        screenPlay.classList.add('hidden');
        screenStart.classList.remove('hidden');
    });

    $('again-btn').addEventListener('click', function () {
        if (window.WordSortFX) window.WordSortFX.clear();
        startRound(poolName);
    });

    $('change-pool-btn').addEventListener('click', function () {
        if (window.WordSortFX) window.WordSortFX.clear();
        screenResult.classList.add('hidden');
        screenStart.classList.remove('hidden');
    });

    $('fullscreen-btn').addEventListener('click', function () {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    });

    /* 觸控螢幕長按會跳出右鍵選單，擋掉 */
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ---------- 啟動 ---------- */

    buildPoolPicker();
})();
