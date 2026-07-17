// quiz
const triviaTotal = document.querySelectorAll('.quiz.trivia').length;
let triviaDone = 0, triviaRight = 0;

function showTriviaScore() {
    const box = document.getElementById('trivia-score');
    if (!box) return;
    let msg;
    if (triviaRight === triviaTotal) msg = '🏆 全對！你是超知識認證的「原子筆博士」！';
    else if (triviaRight >= triviaTotal - 1) msg = '👍 好厲害，差一點就滿分了！';
    else if (triviaRight >= 2) msg = '😊 不錯喔！再把上面的內容看一次，找同學再比一場！';
    else msg = '💪 沒關係，冷知識本來就很冷～看完答案你就是下一個出題大王！';
    box.textContent = `你答對了 ${triviaRight} / ${triviaTotal} 題　${msg}`;
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.quiz').forEach(quiz => {
    const answer = quiz.querySelector('.q-answer');
    quiz.querySelectorAll('.q-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            quiz.querySelectorAll('.q-btn').forEach(b => {
                b.disabled = true;
                if (b.dataset.ok === '1') b.classList.add('correct');
            });
            if (btn.dataset.ok !== '1') btn.classList.add('wrong');
            answer.classList.add('show');
            if (quiz.classList.contains('trivia')) {
                triviaDone++;
                if (btn.dataset.ok === '1') triviaRight++;
                if (triviaDone === triviaTotal) showTriviaScore();
            }
        });
    });
});

// capillary race game
(function () {
    const game = document.getElementById('cap-game');
    if (!game) return;
    const lanes = game.querySelectorAll('.cap-lane');
    const startBtn = document.getElementById('cg-start');
    const resetBtn = document.getElementById('cg-reset');
    const result = document.getElementById('cg-result');
    const finalHeight = { towel: 92, rope: 55, plastic: 4 };
    const raceTime = { towel: 3, rope: 4.5, plastic: 1.2 };
    const matName = { towel: '🧻 紙巾', rope: '🧶 棉繩', plastic: '🥢 塑膠棒' };
    let picked = null, running = false;

    lanes.forEach(lane => {
        lane.addEventListener('click', () => {
            if (running || lane.classList.contains('locked')) return;
            lanes.forEach(l => l.classList.remove('picked'));
            lane.classList.add('picked');
            picked = lane.dataset.mat;
            startBtn.disabled = false;
        });
    });

    startBtn.addEventListener('click', () => {
        if (!picked || running) return;
        running = true;
        startBtn.disabled = true;
        lanes.forEach(lane => {
            lane.classList.add('locked');
            const rise = lane.querySelector('.cap-rise');
            const mat = lane.dataset.mat;
            rise.style.transition = 'height ' + raceTime[mat] + 's ease-out';
            rise.style.height = finalHeight[mat] + '%';
        });
        setTimeout(() => {
            const win = picked === 'towel';
            result.innerHTML =
                '<b>🏆 冠軍是：🧻 紙巾！</b>　' +
                (win ? '🎉 恭喜你猜對了！' : '你猜的是「' + matName[picked] + '」，殘念～再玩一次吧！') +
                '<br>紙巾的纖維<b>縫隙又多又細</b>，毛細作用最強，水爬得最快最高；棉繩的縫隙比較粗，吸得慢一點；塑膠棒表面光滑<b>沒有縫隙</b>，水完全爬不上去。原子筆筆芯裡的細管就是利用這個原理，讓墨水自動往筆尖跑！';
            result.classList.add('show');
            resetBtn.style.display = 'inline-block';
            running = false;
        }, Math.max(raceTime.towel, raceTime.rope, raceTime.plastic) * 1000 + 300);
    });

    resetBtn.addEventListener('click', () => {
        if (running) return;
        lanes.forEach(lane => {
            lane.classList.remove('picked', 'locked');
            const rise = lane.querySelector('.cap-rise');
            rise.style.transition = 'none';
            rise.style.height = '0%';
        });
        picked = null;
        startBtn.disabled = true;
        result.classList.remove('show');
        resetBtn.style.display = 'none';
    });
})();

// rainbow bridge game
(function () {
    const game = document.getElementById('rb-game');
    if (!game) return;
    const startBtn = document.getElementById('rb-start');
    const resetBtn = document.getElementById('rb-reset');
    const result = document.getElementById('rb-result');
    const bridges = Array.from(game.querySelectorAll('.rb-bridge')).map(b => ({
        up: b.querySelector('.rb-legfill.fup'),
        down: b.querySelector('.rb-legfill.fdown'),
        flow: b.querySelector('.rb-flow')
    }));
    const fullJars = ['rb-w1', 'rb-w3', 'rb-w5'].map(id => document.getElementById(id));
    const emptyJars = ['rb-w2', 'rb-w4'].map(id => document.getElementById(id));
    const answers = { left: 'green', right: 'orange' };
    const colorName = { green: '🟢 綠色', purple: '🟣 紫色', brown: '🤎 咖啡色', orange: '🟠 橘色', pink: '🩷 粉紅色' };
    const picks = { left: null, right: null };
    let running = false, played = false;

    game.querySelectorAll('.rb-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (running || played) return;
            const box = chip.closest('.rb-guess-box');
            box.querySelectorAll('.rb-chip').forEach(c => c.classList.remove('picked'));
            chip.classList.add('picked');
            picks[box.dataset.side] = chip.dataset.color;
            if (picks.left && picks.right) startBtn.disabled = false;
        });
    });

    startBtn.addEventListener('click', () => {
        if (!picks.left || !picks.right || running || played) return;
        running = true;
        startBtn.disabled = true;
        bridges.forEach(b => {
            b.up.style.transition = 'height 0.6s linear';
            b.up.style.height = '100%';
            setTimeout(() => {
                b.flow.style.transition = 'width 1.2s linear';
                b.flow.style.width = '100%';
            }, 600);
            setTimeout(() => {
                b.down.style.transition = 'height 0.5s linear';
                b.down.style.height = '100%';
            }, 1800);
        });
        setTimeout(() => {
            fullJars.forEach(w => { w.style.transition = 'height 2.2s ease'; w.style.height = '40%'; });
            emptyJars.forEach(w => { w.style.transition = 'height 2.2s ease'; w.style.height = '38%'; });
        }, 2300);
        setTimeout(() => {
            let right = 0;
            if (picks.left === answers.left) right++;
            if (picks.right === answers.right) right++;
            result.innerHTML =
                '<b>🌈 答案揭曉：藍＋黃＝🟢 綠色、黃＋紅＝🟠 橘色！</b>　你答對了 ' + right + ' / 2 題' +
                (right === 2 ? '，太厲害了 🎉' : '，再玩一次觀察看看～') +
                '<br>水靠<b>毛細現象</b>沿著紙巾纖維的細縫爬上橋頂、再流進空罐；兩邊的顏色在空罐裡相遇，就調出新的顏色！' +
                '<br><b>🤓 小知識：</b>彩虹橋常被誤會成「虹吸現象」——虹吸需要一根裝滿水的密閉管子讓水連續流動，而紙巾橋是靠纖維縫隙一點一點把水吸過去，其實是毛細現象喔！';
            result.classList.add('show');
            resetBtn.style.display = 'inline-block';
            running = false;
            played = true;
        }, 4900);
    });

    resetBtn.addEventListener('click', () => {
        if (running) return;
        bridges.forEach(b => {
            b.up.style.transition = 'none';
            b.up.style.height = '0';
            b.down.style.transition = 'none';
            b.down.style.height = '0';
            b.flow.style.transition = 'none';
            b.flow.style.width = '0';
        });
        fullJars.forEach(w => { w.style.transition = 'none'; w.style.height = '55%'; });
        emptyJars.forEach(w => { w.style.transition = 'none'; w.style.height = '0%'; });
        game.querySelectorAll('.rb-chip').forEach(c => c.classList.remove('picked'));
        picks.left = null;
        picks.right = null;
        played = false;
        startBtn.disabled = true;
        result.classList.remove('show');
        resetBtn.style.display = 'none';
    });
})();
