// 單純規則獨立於畫面，便於確認五題答案與重讀存檔。
export function correctSequence(selected, answer) {
    return Array.isArray(selected) && selected.length === answer.length &&
        selected.every((id, index) => id === answer[index]);
}

export function correctMatches(selected, rows) {
    return rows.every(row => selected[row.id] === row.answer);
}

export function correctLight(angles) {
    return Array.isArray(angles) && angles.length === 2 && angles.every(angle => angle === 1);
}
