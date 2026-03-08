export class HistoryView {
  constructor(listEl) {
    this.listEl = listEl;
  }

  render(history) {
    this.listEl.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('li');
      empty.className = 'lc-history-empty';
      empty.textContent = 'Aucun coup joué.';
      this.listEl.appendChild(empty);
      return;
    }

    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement('li');
      li.className = 'lc-history-row';
      const number = document.createElement('span');
      number.className = 'ply-number';
      number.textContent = `${Math.floor(i / 2) + 1}.`;

      const white = document.createElement('span');
      white.className = 'ply';
      white.textContent = history[i]?.san || '…';

      const black = document.createElement('span');
      black.className = 'ply';
      black.textContent = history[i + 1]?.san || '';

      li.append(number, white, black);
      this.listEl.appendChild(li);
    }
  }
}
