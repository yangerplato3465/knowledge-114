/* 深色 / 淺色主題切換
   - 讀取 localStorage('knowledge114-theme')：'dark' | 'light' | 未設定(跟隨系統)
   - 注入右下角浮動切換鈕
   多頁共用；每頁在 <head> 引入 theme.css，於 </body> 前引入本檔。 */
(function () {
    const KEY = 'knowledge114-theme';
    const root = document.documentElement;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function systemDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function isDark() {
        const s = root.getAttribute('data-theme');
        if (s === 'dark') return true;
        if (s === 'light') return false;
        return systemDark();
    }

    function apply(mode) {
        if (mode === 'dark' || mode === 'light') {
            root.setAttribute('data-theme', mode);
        } else {
            root.removeAttribute('data-theme');
        }
    }

    /* 儘早套用，避免深色頁面閃白 */
    apply(stored());

    function updateBtn(btn) {
        const dark = isDark();
        btn.innerHTML = dark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute('aria-label', dark ? '切換到淺色模式' : '切換到深色模式');
        btn.title = dark ? '淺色模式' : '深色模式';
    }

    function build() {
        if (document.querySelector('.theme-toggle')) return;
        const btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.type = 'button';
        updateBtn(btn);
        btn.addEventListener('click', function () {
            const next = isDark() ? 'light' : 'dark';
            try { localStorage.setItem(KEY, next); } catch (e) {}
            apply(next);
            updateBtn(btn);
        });
        document.body.appendChild(btn);
        const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        if (media && media.addEventListener) media.addEventListener('change', () => updateBtn(btn));
        window.addEventListener('storage', event => {
            if (event.key === KEY || event.key === null) {
                apply(stored());
                updateBtn(btn);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
