let naohCount = 0;
let hasIndicator = false;
let temperature = 25.0;

const waterLiquid = document.getElementById('water-liquid');
const waterWave = document.getElementById('water-wave');
const thermometerLabel = document.getElementById('thermometer-label');
const mercuryBar = document.getElementById('mercury-bar');
const ionContainer = document.getElementById('ion-container');
const dropletAnim = document.getElementById('droplet-anim');
const pelletAnim = document.getElementById('naoh-falling-pellet');
const splashRipple = document.getElementById('splash-ripple');

window.addEventListener('DOMContentLoaded', () => {
    pelletAnim.addEventListener('animationend', (e) => {
        if (e.animationName === 'fall-pellet') {
            pelletAnim.classList.remove('pellet-falling');

            waterWave.classList.remove('wave-impact');
            void waterWave.offsetWidth;
            waterWave.classList.add('wave-impact');

            splashRipple.style.borderColor = '#81d4fa';
            splashRipple.classList.remove('splash-active');
            void splashRipple.offsetWidth;
            splashRipple.classList.add('splash-active');

            naohCount++;

            createIonElement('Na', false);
            createIonElement('OH', false);

            updateBeakerVisuals();
        }
    });

    dropletAnim.addEventListener('animationend', (e) => {
        if (e.animationName === 'fall-droplet') {
            dropletAnim.classList.remove('droplet-falling');

            waterWave.classList.remove('wave-impact');
            void waterWave.offsetWidth;
            waterWave.classList.add('wave-impact');

            splashRipple.style.borderColor = '#e91e63';
            splashRipple.classList.remove('splash-active');
            void splashRipple.offsetWidth;
            splashRipple.classList.add('splash-active');

            hasIndicator = true;
            updateBeakerVisuals();
        }
    });

    waterWave.addEventListener('animationend', (e) => {
        if (e.animationName === 'wave-bounce') {
            waterWave.classList.remove('wave-impact');
        }
    });

    splashRipple.addEventListener('animationend', () => {
        splashRipple.classList.remove('splash-active');
    });
});

function updateBeakerVisuals() {
    temperature = 25.0 + (naohCount * 14.5);
    if (temperature > 85) temperature = 85.0;
    thermometerLabel.innerText = `${temperature.toFixed(1)}°C`;

    const mercuryHeight = Math.max(10, Math.min(100, (temperature / 100) * 100));
    mercuryBar.style.height = `${mercuryHeight}%`;

    if (hasIndicator) {
        if (naohCount > 0) {
            waterLiquid.style.backgroundColor = "rgba(233, 30, 99, 0.72)";
        } else {
            waterLiquid.style.backgroundColor = "rgba(179, 229, 252, 0.55)";
        }
    } else {
        waterLiquid.style.backgroundColor = "rgba(179, 229, 252, 0.55)";
    }
}

function addNaOH() {
    if (naohCount >= 6) return;
    if (pelletAnim.classList.contains('pellet-falling')) return;

    pelletAnim.className = '';
    void pelletAnim.offsetWidth;
    pelletAnim.classList.add('pellet-falling');
}

function addIndicator() {
    if (hasIndicator) return;
    if (dropletAnim.classList.contains('droplet-falling')) return;

    dropletAnim.className = '';
    void dropletAnim.offsetWidth;
    dropletAnim.classList.add('droplet-falling');
}

function createIonElement(type, preExisting = false) {
    const ion = document.createElement('div');

    let ionClass = '';
    if (type === 'Na') ionClass = 'ion-na';
    else if (type === 'OH') ionClass = 'ion-oh';
    else ionClass = 'ion-h';

    ion.className = `floating-ion ${preExisting ? 'ion-floating' : 'ion-emerging'} ${ionClass}`;

    if (type === 'Na') {
        ion.innerHTML = `
            <svg viewBox="0 0 32 32" style="width: 100%; height: 100%;">
                <circle cx="16" cy="16" r="12" fill="#ff8a65" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="20.5" font-family="'Fredoka', sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">Na⁺</text>
            </svg>
        `;
    } else if (type === 'OH') {
        ion.innerHTML = `
            <svg viewBox="0 0 32 32" style="width: 100%; height: 100%;">
                <circle cx="16" cy="16" r="12" fill="#4db6ac" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="20.5" font-family="'Fredoka', sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">OH⁻</text>
            </svg>
        `;
    } else {
        ion.innerHTML = `
            <svg viewBox="0 0 32 32" style="width: 100%; height: 100%;">
                <circle cx="16" cy="16" r="11" fill="#fff9f8" stroke="#ff8a65" stroke-width="2"/>
                <text x="16" y="20.5" font-family="'Fredoka', sans-serif" font-size="11" font-weight="900" fill="#ff8a65" text-anchor="middle">H⁺</text>
            </svg>
        `;
    }

    const destX = Math.floor(Math.random() * 60 + 12);
    const destY = Math.floor(Math.random() * 40 + 20);

    ion.style.left = `${destX}px`;
    ion.style.top = `${destY}px`;

    if (preExisting) {
        ion.style.opacity = '1';
        ion.style.setProperty('--idle-x', `${(Math.random() * 8 - 4).toFixed(1)}px`);
        ion.style.setProperty('--idle-y', `${(Math.random() * 10 - 5).toFixed(1)}px`);
        ion.style.animationDuration = `${3.5 + Math.random() * 3}s`;
    } else {
        ion.style.setProperty('--dest-x', `${destX}px`);
        ion.style.setProperty('--dest-y', `${destY}px`);

        ion.addEventListener('animationend', (e) => {
            if (e.animationName === 'emerge-and-scatter') {
                ion.classList.remove('ion-emerging');
                ion.style.opacity = '1';
                ion.classList.add('ion-floating');

                ion.style.setProperty('--idle-x', `${(Math.random() * 8 - 4).toFixed(1)}px`);
                ion.style.setProperty('--idle-y', `${(Math.random() * 10 - 5).toFixed(1)}px`);
                ion.style.animationDuration = `${3.5 + Math.random() * 3}s`;
            }
        });
    }

    ionContainer.appendChild(ion);
}

function resetExperiment() {
    naohCount = 0;
    hasIndicator = false;
    temperature = 25.0;
    ionContainer.innerHTML = '';

    updateBeakerVisuals();

    document.querySelectorAll('.feedback-alert').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.style.borderColor = "#ffe0b2";
        btn.style.backgroundColor = "#ffffff";
        btn.style.color = "#6d5d5b";
    });
}

function checkAnswer(btn, isCorrect, feedbackId) {
    const parent = btn.parentElement;
    const feedbackEl = document.getElementById(feedbackId);

    parent.querySelectorAll('.option-btn').forEach(b => {
        b.style.borderColor = "#ffe0b2";
        b.style.backgroundColor = "#ffffff";
        b.style.color = "#6d5d5b";
    });

    feedbackEl.style.display = 'block';

    if (isCorrect) {
        btn.style.borderColor = "#4db6ac";
        btn.style.backgroundColor = "#e0f2f1";
        btn.style.color = "#00796b";
        feedbackEl.innerHTML = `<i class="fa-solid fa-face-laugh-beam"></i> 答對了！恭喜你，實驗觀察非常入微！`;
        feedbackEl.style.color = "#00796b";
        feedbackEl.style.backgroundColor = "#e0f2f1";
    } else {
        btn.style.borderColor = "#ff8a65";
        btn.style.backgroundColor = "#fbe9e7";
        btn.style.color = "#d84315";
        feedbackEl.innerHTML = `<i class="fa-solid fa-seedling"></i> 答案不太對喔！試著加一些 NaOH 或重設實驗再觀察一次！`;
        feedbackEl.style.color = "#d84315";
        feedbackEl.style.backgroundColor = "#fbe9e7";
    }
}
