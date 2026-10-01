const { test } = require('node:test');
const assert = require('node:assert/strict');

test('新驗證碼使用案件三碼英文與四位數字，舊碼仍可驗證', async () => {
    const { randomCode, normalizeCode, deriveCodeId } = await import('../assets/js/detective/code.js');
    for (const prefix of ['OWL', 'AIM', 'STR']) {
        for (let i = 0; i < 30; i++) {
            assert.match(randomCode(prefix), new RegExp(`^${prefix}-\\d{4}$`));
        }
    }
    assert.equal(normalizeCode('str-0042'), 'STR0042');
    assert.equal(
        await deriveCodeId('owl', 'OWL-7K3M-92'),
        await deriveCodeId('owl', 'owl 7k3m 92'),
    );
});

test('只有本機網址可進入免驗碼試玩', async () => {
    const { isLocalPreview } = await import('../assets/js/detective/code.js');
    for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) assert.equal(isLocalPreview(host), true);
    for (const host of ['example.com', 'localhost.example.com', '192.168.1.5']) assert.equal(isLocalPreview(host), false);
});
