import { FILES, coordsToSquare, squareToCoords } from './utils.js';

const PIECE_MAP = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚'
};

export class BoardView {
  constructor(root, callbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.orientation = 'w';
    this.bindings = new Map();
    this.renderBase();
  }

  setOrientation(color) {
    this.orientation = color;
    this.root.dataset.orientation = color;
    this.renderCoordinates();
  }

  renderBase() {
    this.root.innerHTML = '';
    this.root.classList.add('lc-board');
    const grid = document.createElement('div');
    grid.className = 'lc-grid';
    this.grid = grid;
    this.root.appendChild(grid);

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = `lc-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        const logical = coordsToSquare(row, col);
        square.dataset.square = logical;
        square.addEventListener('click', () => this.callbacks.onSquareClick(logical));
        square.addEventListener('dragover', (event) => event.preventDefault());
        square.addEventListener('drop', (event) => {
          event.preventDefault();
          const from = event.dataTransfer?.getData('text/plain');
          if (from) this.callbacks.onDrop(from, logical);
        });
        grid.appendChild(square);
        this.bindings.set(logical, square);
      }
    }

    const fileCoords = document.createElement('div');
    fileCoords.className = 'lc-coords lc-files';
    this.fileCoords = fileCoords;
    this.root.appendChild(fileCoords);

    const rankCoords = document.createElement('div');
    rankCoords.className = 'lc-coords lc-ranks';
    this.rankCoords = rankCoords;
    this.root.appendChild(rankCoords);
    this.renderCoordinates();
  }

  renderCoordinates() {
    this.fileCoords.innerHTML = '';
    this.rankCoords.innerHTML = '';

    const files = this.orientation === 'w' ? FILES : [...FILES].reverse();
    files.forEach((file) => {
      const label = document.createElement('span');
      label.textContent = file;
      this.fileCoords.appendChild(label);
    });

    const ranks = this.orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    ranks.forEach((rank) => {
      const label = document.createElement('span');
      label.textContent = String(rank);
      this.rankCoords.appendChild(label);
    });
  }

  render(state, uiState) {
    this.bindings.forEach((squareEl, square) => {
      const { row, col } = squareToCoords(square);
      const viewRow = this.orientation === 'w' ? row : 7 - row;
      const viewCol = this.orientation === 'w' ? col : 7 - col;
      const boardIndex = viewRow * 8 + viewCol;
      this.grid.children[boardIndex].replaceWith(squareEl);

      squareEl.classList.toggle('selected', uiState.selectedSquare === square);
      squareEl.classList.toggle('candidate', uiState.legalTargets.has(square));
      squareEl.classList.toggle('last-move', uiState.lastMove?.from === square || uiState.lastMove?.to === square);
      squareEl.classList.toggle('in-check', uiState.checkedKingSquare === square);
      squareEl.textContent = '';

      const piece = state.board[row][col];
      if (!piece) return;
      const pieceEl = document.createElement('span');
      pieceEl.className = `lc-piece ${piece.color === 'w' ? 'white' : 'black'}`;
      pieceEl.textContent = PIECE_MAP[`${piece.color}${piece.type}`];
      pieceEl.draggable = true;
      pieceEl.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('text/plain', square);
        this.callbacks.onDragStart(square);
      });
      pieceEl.addEventListener('dragend', () => this.callbacks.onDragEnd());
      squareEl.appendChild(pieceEl);
    });
  }
}
