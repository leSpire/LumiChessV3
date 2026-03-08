import { ChessEngine, DEFAULT_FEN } from './chess/engine.js';
import { BoardView } from './chess/board-view.js';
import { HistoryView } from './chess/history-view.js';

const engine = new ChessEngine(DEFAULT_FEN);

const boardRoot = document.getElementById('boardRoot');
const turnBadge = document.getElementById('turnBadge');
const statusLine = document.getElementById('statusLine');
const fenField = document.getElementById('fenField');
const pgnField = document.getElementById('pgnField');
const historyList = document.getElementById('historyList');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const loadFenBtn = document.getElementById('loadFenBtn');
const promotionModal = document.getElementById('promotionModal');
const promotionChoices = document.getElementById('promotionChoices');

const uiState = {
  selectedSquare: null,
  legalTargets: new Set(),
  orientation: 'w',
  pendingMove: null,
  lastMove: null,
  checkedKingSquare: null
};

const boardView = new BoardView(boardRoot, {
  onSquareClick: handleSquareClick,
  onDrop: handleDrop,
  onDragStart: handleDragStart,
  onDragEnd: handleDragEnd
});
const historyView = new HistoryView(historyList);

function refreshView() {
  const state = engine.getState();
  const status = state.status;

  uiState.lastMove = state.history.at(-1) || null;
  uiState.checkedKingSquare = status.inCheck ? findKingSquare(state.board, status.inCheck) : null;

  turnBadge.textContent = state.turn === 'w' ? 'Trait: Blancs' : 'Trait: Noirs';
  statusLine.textContent = toStatusLabel(status);
  fenField.value = state.fen;
  pgnField.value = engine.getPGN();

  historyView.render(state.history);
  boardView.setOrientation(uiState.orientation);
  boardView.render(state, uiState);
}

function clearSelection() {
  uiState.selectedSquare = null;
  uiState.legalTargets.clear();
}

function selectSquare(square) {
  clearSelection();
  const state = engine.getState();
  const piece = getPieceAt(state.board, square);
  if (!piece || piece.color !== state.turn) return;

  uiState.selectedSquare = square;
  engine.getLegalMoves(square).forEach((move) => uiState.legalTargets.add(move.to));
}

function handleSquareClick(square) {
  const state = engine.getState();
  const piece = getPieceAt(state.board, square);

  if (!uiState.selectedSquare) {
    if (piece && piece.color === state.turn) selectSquare(square);
    refreshView();
    return;
  }

  if (square === uiState.selectedSquare) {
    clearSelection();
    refreshView();
    return;
  }

  if (piece && piece.color === state.turn) {
    selectSquare(square);
    refreshView();
    return;
  }

  tryMove(uiState.selectedSquare, square);
}

function handleDragStart(square) {
  const state = engine.getState();
  const piece = getPieceAt(state.board, square);
  if (!piece || piece.color !== state.turn) return;
  selectSquare(square);
  refreshView();
}

function handleDragEnd() {
  clearSelection();
  refreshView();
}

function handleDrop(from, to) {
  tryMove(from, to);
}

function tryMove(from, to) {
  const moves = engine.getLegalMoves(from).filter((move) => move.to === to);
  if (!moves.length) {
    boardRoot.classList.remove('illegal-flash');
    boardRoot.offsetHeight;
    boardRoot.classList.add('illegal-flash');
    clearSelection();
    refreshView();
    return;
  }

  const promotionMoves = moves.filter((move) => move.promotion);
  if (promotionMoves.length) {
    openPromotion(from, to);
    return;
  }

  applyMove({ from, to });
}

function openPromotion(from, to) {
  uiState.pendingMove = { from, to };
  promotionChoices.querySelectorAll('button').forEach((button) => {
    button.onclick = () => {
      applyMove({ ...uiState.pendingMove, promotion: button.dataset.promotion });
      closePromotion();
    };
  });
  promotionModal.showModal();
}

function closePromotion() {
  uiState.pendingMove = null;
  promotionModal.close();
}

function applyMove(move) {
  const result = engine.move(move);
  clearSelection();
  if (!result.ok) {
    refreshView();
    return;
  }
  refreshView();
}

function getPieceAt(board, square) {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - Number(square[1]);
  return board[rank][file];
}

function findKingSquare(board, color) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece?.type === 'k' && piece.color === color) {
        return `${String.fromCharCode(97 + col)}${8 - row}`;
      }
    }
  }
  return null;
}

function toStatusLabel(status) {
  switch (status.state) {
    case 'check':
      return `Échec sur ${status.inCheck === 'w' ? 'les Blancs' : 'les Noirs'}`;
    case 'checkmate':
      return `Échec et mat · Victoire ${status.winner === 'w' ? 'Blancs' : 'Noirs'}`;
    case 'stalemate':
      return 'Pat · Partie nulle';
    case 'draw-50':
      return 'Nulle (règle des 50 coups)';
    default:
      return 'Partie en cours';
  }
}

resetBtn.addEventListener('click', () => {
  engine.reset();
  clearSelection();
  refreshView();
});

flipBtn.addEventListener('click', () => {
  uiState.orientation = uiState.orientation === 'w' ? 'b' : 'w';
  refreshView();
});

loadFenBtn.addEventListener('click', () => {
  try {
    engine.history = [];
    engine.loadFEN(fenField.value);
    clearSelection();
    refreshView();
  } catch (error) {
    statusLine.textContent = `FEN invalide: ${error.message}`;
  }
});

promotionModal.addEventListener('cancel', (event) => {
  event.preventDefault();
  closePromotion();
  clearSelection();
  refreshView();
});

refreshView();
