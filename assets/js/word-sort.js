/* 字尾大分流 · 遊戲邏輯
   ------------------------------------------------------------------
   讀 word-sort-pools.js 定義的全域 WORD_SORT_POOLS（載入順序不能顛倒）。

   教學焦點是 -ful / -less 的語意與構詞：

   1. 依中文意思判斷 -ful（有／充滿）與 -less（沒有）。
   2. 完整單字從來沒有存在資料裡，一律 item.stem + item.suffix
      當場算出來（見 wordOf）。畫面上那個虛線格子滑過去黏住字根的動畫，
      演的就是這一行程式。
   3. 分類後用輸送帶反向練習「意思＋字尾 → 找字根」。

   queue / fulArr / lessArr 仍是內部資料結構，但不再當成學生的學習內容。

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
    var screenChallenge = $('screen-challenge');
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
    var actionZh = $('array-action-zh');
    var actionCode = $('array-action-code');
    var challengeProgress = $('challenge-progress');
    var challengeKicker = $('challenge-kicker');
    var challengeZh = $('challenge-zh');
    var challengeCode = $('challenge-code');
    var challengeFeedback = $('challenge-feedback');
    var challengeVisual = $('challenge-visual');
    var challengeOptions = $('challenge-options');

    /* ---------- 狀態 ---------- */
    var queue = [];       /* 待作答，永遠從 [0] 開始出題 */
    var fulArr = [];      /* 分到 -ful 的完整單字 */
    var lessArr = [];     /* 分到 -less 的完整單字 */
    var wrongList = [];   /* 答錯的題目，結算時複習用 */
    var learnedItems = []; /* 本局出現過的題目，快遞站拿來做字根＋字尾複習 */
    var rightCount = 0;
    var locked = false;   /* 揭曉動畫期間擋住重複作答 */
    var poolName = '';
    var startTime = 0;
    var timerId = null;
    var advanceTimer = null;
    var challengeTasks = [];
    var challengeAt = 0;
    var challengeRight = 0;
    var courierFrame = 0;
    var courierX = 0;
    var courierSpeed = 0;
    var courierStartX = 0;
    var courierCycleWidth = 0;
    var courierLastTime = 0;
    var courierTrack = null;
    var courierTarget = null;

    /* 字串結合就發生在這一行 —— 完整單字不存資料，每次現算 */
    function wordOf(item) {
        return item.stem + item.suffix;
    }

    function showArrayAction(zh, code) {
        actionZh.textContent = zh;
        actionCode.textContent = code;
        var box = $('array-action');
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
    }

    /* 使用裝置內建語音，不下載音檔；沒有 speechSynthesis 時安靜略過。 */
    function speakWord(word) {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.78;
        window.speechSynthesis.speak(utterance);
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
        learnedItems = [];
        rightCount = 0;
        locked = false;

        statRight.textContent = '0';
        statWrong.textContent = '0';
        renderCollected(null);

        screenStart.classList.add('hidden');
        screenResult.classList.add('hidden');
        screenChallenge.classList.add('hidden');
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
        showArrayAction('看意思，選出正確的字尾', queue[0].stem + ' + ?');
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

            var txt = document.createElement('span');
            /* 只露字根，不露答案 */
            txt.textContent = queue[i].stem;

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
        showArrayAction('看意思，選出正確的字尾', item.stem + ' + ?');
    }

    /* ---------- 收集籃：兩組已完成單字 ---------- */

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

                var word = document.createElement('span');
                word.className = 'ci-w';
                word.textContent = w;

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
        learnedItems.push(item);

        /* 不論對錯，收集籃都放正確答案；錯的是分數，不是複習內容。 */
        if (item.suffix === 'ful') fulArr.push(word);
        else lessArr.push(word);

        showArrayAction(
            '字根和字尾合起來，變成 ' + word,
            item.stem + ' + ' + item.suffix + ' = ' + word
        );

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
        setTimeout(function () {
            wSlot.classList.add('merged');
            speakWord(word);
        }, MERGE_DELAY);

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

        /* 剛拼好的單字掉進對應字尾的收集籃 */
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
            if (queue.length === 0) { startChallenge(); return; }
            card.classList.remove('settling');
            renderQuestion();
        });
    }

    /* 下一題遞補的動畫版。
       ------------------------------------------------------------
       刻意拆成兩個看得懂的步驟：
         ① 已完成的字根往上飛走
         ② 後面的字根全體往前遞補

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

        showArrayAction('這個單字完成，準備下一題', wordOf(queue[0]));
        chips[0].classList.add('leaving');

        setTimeout(function () {
            /* First：倖存者現在在哪裡 */
            var before = chips.slice(1).map(function (c) {
                return c.getBoundingClientRect().left;
            });

            queue.shift();          /* 內部資料移除已完成的第一題 */
            renderQueueHud();       /* Last：重畫剩餘字根 */

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

            showArrayAction(
                queue.length ? '下一個字根上場' : '全部單字都完成了',
                queue.length ? queue[0].stem + ' + ?' : '-ful / -less ✓'
            );

            /* 等遞補動畫被看見，再換下一張卡。 */
            setTimeout(done, 420);
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

    /* ---------- 分類後的字尾快遞站 ---------- */

    function makeChallengeTasks() {
        var unique = [];
        shuffle(learnedItems).forEach(function (item) {
            if (!unique.some(function (seen) { return seen.stem === item.stem; })) unique.push(item);
        });

        /* 三次至少各出現一次 -ful / -less，避免快遞站剛好只練到一種字尾。 */
        var targets = [];
        ['ful', 'less'].forEach(function (suffix) {
            var found = unique.find(function (item) {
                return item.suffix === suffix
                    && !targets.some(function (picked) { return picked.stem === item.stem; });
            });
            if (found) targets.push(found);
        });
        unique.forEach(function (item) {
            if (targets.length >= 3) return;
            if (!targets.some(function (picked) { return picked.stem === item.stem; })) targets.push(item);
        });

        return shuffle(targets).map(function (target) {
            var distractors = unique.filter(function (item) { return item.stem !== target.stem; });
            var options = shuffle([target].concat(shuffle(distractors).slice(0, 5)));
            return {
                target: target,
                options: options,
                targetIndex: options.indexOf(target)
            };
        });
    }

    function setChallengeProgress() {
        Array.prototype.forEach.call(challengeProgress.children, function (light, index) {
            light.classList.toggle('lit', index < challengeRight);
            light.classList.toggle('active', index === challengeAt);
        });
        challengeProgress.setAttribute('aria-label', '已完成 ' + challengeRight + ' 個，共 3 個任務');
    }

    function stopCourier() {
        if (courierFrame) cancelAnimationFrame(courierFrame);
        courierFrame = 0;
        courierTrack = null;
        courierTarget = null;
    }

    function challengeBurst(element, side) {
        if (!window.WordSortFX || !element) return;
        var r = element.getBoundingClientRect();
        window.WordSortFX.burst(r.left + r.width / 2, r.top + r.height / 2, {
            count: 80,
            power: 15,
            spread: Math.PI * 1.5,
            colors: side === 'ful'
                ? [0xd98026, 0xe8c34a, 0xffffff]
                : [0x3f7fb5, 0x7fb2dc, 0xffffff]
        });
    }

    function makeCrate(item, index) {
        var crate = document.createElement('div');
        crate.className = 'courier-crate';
        crate.dataset.index = index;
        crate.innerHTML = '<b>' + item.stemZh + '</b><span>' + item.stem + '</span>';
        return crate;
    }

    function startChallenge() {
        clearInterval(timerId);
        timerId = null;
        challengeTasks = makeChallengeTasks();
        challengeAt = 0;
        challengeRight = 0;
        screenPlay.classList.add('hidden');
        screenChallenge.classList.remove('hidden');
        renderChallenge();
    }

    function renderChallenge() {
        stopCourier();
        var task = challengeTasks[challengeAt];
        setChallengeProgress();
        challengeFeedback.textContent = '';
        challengeFeedback.className = 'challenge-feedback';
        challengeVisual.className = 'challenge-visual courier';
        challengeVisual.innerHTML = '';
        challengeOptions.className = 'challenge-options courier';
        challengeOptions.innerHTML = '';
        renderCourier(task);
    }

    function renderCourier(task) {
        var target = task.target;
        challengeKicker.textContent = '單字快遞 ' + (challengeAt + 1) + ' / ' + challengeTasks.length;
        challengeZh.textContent = '找出能組成「' + target.def + '」的字根';
        challengeCode.textContent = '? + ' + target.suffix;

        var viewport = document.createElement('div');
        viewport.className = 'conveyor-viewport ' + target.suffix;
        var belt = document.createElement('div');
        belt.className = 'conveyor-belt';
        courierTrack = document.createElement('div');
        courierTrack.className = 'courier-track';
        task.options.forEach(function (item, index) {
            courierTrack.appendChild(makeCrate(item, index));
        });
        /* 再放一組相同箱子，首尾相接循環；否則最後一箱離場到第一箱重來之間
           會有好幾秒空輸送帶，孩子按什麼都只能得到「還沒有箱子」。 */
        task.options.forEach(function (item, index) {
            var duplicate = makeCrate(item, index);
            duplicate.dataset.cycle = '2';
            duplicate.setAttribute('aria-hidden', 'true');
            courierTrack.appendChild(duplicate);
        });
        var scanner = document.createElement('div');
        scanner.className = 'scanner-gate';
        scanner.innerHTML = '<span>SCAN</span>';
        viewport.appendChild(belt);
        viewport.appendChild(courierTrack);
        viewport.appendChild(scanner);
        challengeVisual.appendChild(viewport);

        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'challenge-send';
        send.innerHTML = '<i class="fa-solid fa-truck-fast"></i><span>送出！</span>';
        send.addEventListener('click', function () { catchCourier(task, viewport, scanner, send); });
        challengeOptions.appendChild(send);

        requestAnimationFrame(function () {
            var first = courierTrack.children[0];
            var secondCycle = courierTrack.querySelector('[data-cycle="2"]');
            courierStartX = viewport.clientWidth / 2 - first.offsetWidth / 2;
            courierCycleWidth = secondCycle.offsetLeft - first.offsetLeft;
            courierX = courierStartX;
            courierSpeed = Math.max(190, viewport.clientWidth * 0.19);
            courierLastTime = performance.now();
            courierTarget = courierTrack.querySelector('[data-index="' + task.targetIndex + '"]');
            moveCourier(courierLastTime, viewport);
        });
    }

    function moveCourier(now, viewport) {
        if (!courierTrack) return;
        var delta = Math.min(40, now - courierLastTime) / 1000;
        courierLastTime = now;
        courierX -= courierSpeed * delta;
        if (courierCycleWidth && courierX <= courierStartX - courierCycleWidth) {
            courierX += courierCycleWidth;
        }
        courierTrack.style.transform = 'translateX(' + courierX + 'px)';
        courierFrame = requestAnimationFrame(function (time) { moveCourier(time, viewport); });
    }

    function catchCourier(task, viewport, scanner, button) {
        if (!courierTrack || button.disabled) return;
        var scanRect = scanner.getBoundingClientRect();
        var scanX = scanRect.left + scanRect.width / 2;
        var crates = Array.prototype.slice.call(courierTrack.children);
        var nearest = null;
        var distance = Infinity;
        crates.forEach(function (crate) {
            var r = crate.getBoundingClientRect();
            var d = Math.abs((r.left + r.width / 2) - scanX);
            if (d < distance) { distance = d; nearest = crate; }
        });

        var allowed = scanRect.width * 0.62;
        if (!nearest || distance > allowed) {
            challengeFeedback.textContent = '掃描門裡還沒有箱子，再等一下！';
            challengeFeedback.className = 'challenge-feedback wrong';
            viewport.classList.add('oops');
            setTimeout(function () { viewport.classList.remove('oops'); }, 350);
            return;
        }

        var caught = Number(nearest.dataset.index);
        if (caught !== task.targetIndex) {
            var wrongItem = task.options[caught];
            challengeFeedback.textContent = '剛才抓到 ' + wrongItem.stem
                + '，它不是「' + task.target.def + '」需要的字根。減速再試一次！';
            challengeFeedback.className = 'challenge-feedback wrong';
            nearest.classList.add('wrong');
            courierSpeed = Math.max(105, courierSpeed * 0.78);
            setTimeout(function () { nearest.classList.remove('wrong'); }, 500);
            return;
        }

        stopCourier();
        button.disabled = true;
        nearest.classList.add('caught');
        var fullWord = wordOf(task.target);
        challengeCode.textContent = task.target.stem + ' + ' + task.target.suffix + ' = ' + fullWord;
        challengeFeedback.textContent = fullWord + '，就是「' + task.target.def + '」！';
        challengeFeedback.className = 'challenge-feedback correct';
        speakWord(fullWord);
        challengeBurst(nearest, task.target.suffix);
        completeChallengeTask();
    }

    function completeChallengeTask() {
        challengeRight++;
        setChallengeProgress();
        setTimeout(function () {
            challengeOptions.classList.remove('locked');
            challengeAt++;
            if (challengeAt >= challengeTasks.length) finish();
            else renderChallenge();
        }, 1250);
    }

    /* ---------- 結算 ---------- */

    /* 結算只留成績和答錯的字，避免再增加一層課後測驗。 */
    function finish() {
        clearInterval(timerId);
        timerId = null;
        document.body.classList.remove('playing');

        var total = rightCount + wrongList.length;
        var seconds = Math.floor((Date.now() - startTime) / 1000);

        $('result-title').textContent = wrongList.length === 0 ? '全部答對！' : '分完了！';
        $('result-score').innerHTML = '答對 <b>' + rightCount + '</b> / ' + total
            + ' 題　·　用時 ' + Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2)
            + '　·　字尾快遞完成'
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
        screenChallenge.classList.add('hidden');
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

    $('challenge-quit-btn').addEventListener('click', function () {
        stopCourier();
        window.speechSynthesis && window.speechSynthesis.cancel();
        document.body.classList.remove('playing');
        screenChallenge.classList.add('hidden');
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
