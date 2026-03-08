import { squareToCoords, coordsToSquare, inBounds, cloneBoard, opposite } from './utils.js';

const START_FEN = 'rn1qkbnr/pppbpppp/8/3p4/3P4/4PN2/PPP1BPPP/RNBQK2R w KQkq - 0 4';
const STANDARD_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_OFFSETS = {
  n: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
  k: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
};

const SLIDERS = {
  b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
};

export class ChessEngine {
  constructor(fen = STANDARD_START) {
    this.history = [];
    this.loadFEN(fen);
  }

  reset() {
    this.history = [];
    this.loadFEN(STANDARD_START);
  }

  loadFEN(fen) {
    const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.trim().split(/\s+/);
    if (!placement || !turn) throw new Error('FEN invalide');

    const ranks = placement.split('/');
    if (ranks.length !== 8) throw new Error('FEN invalide : 8 rangées attendues');

    const board = Array.from({ length: 8 }, () => Array(8).fill(null));

    ranks.forEach((rank, rowIndex) => {
      let col = 0;
      for (const symbol of rank) {
        if (/\d/.test(symbol)) {
          col += Number(symbol);
          continue;
        }
        const color = symbol === symbol.toUpperCase() ? 'w' : 'b';
        const type = symbol.toLowerCase();
        board[rowIndex][col] = { color, type };
        col += 1;
      }
      if (col !== 8) throw new Error('FEN invalide : colonnes incorrectes');
    });

    this.board = board;
    this.turn = turn;
    this.castling = {
      w: { k: castling?.includes('K') ?? false, q: castling?.includes('Q') ?? false },
      b: { k: castling?.includes('k') ?? false, q: castling?.includes('q') ?? false }
    };
    this.enPassant = enPassant && enPassant !== '-' ? enPassant : null;
    this.halfmove = Number(halfmove || 0);
    this.fullmove = Number(fullmove || 1);
  }

  getState() {
    return {
      board: cloneBoard(this.board),
      turn: this.turn,
      castling: JSON.parse(JSON.stringify(this.castling)),
      enPassant: this.enPassant,
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      fen: this.toFEN(),
      history: this.history.map((entry) => ({ ...entry })),
      status: this.getStatus()
    };
  }

  toFEN() {
    const placement = this.board
      .map((rank) => {
        let out = '';
        let empty = 0;
        rank.forEach((cell) => {
          if (!cell) {
            empty += 1;
            return;
          }
          if (empty) {
            out += empty;
            empty = 0;
          }
          out += cell.color === 'w' ? cell.type.toUpperCase() : cell.type;
        });
        if (empty) out += empty;
        return out;
      })
      .join('/');

    const castling =
      `${this.castling.w.k ? 'K' : ''}${this.castling.w.q ? 'Q' : ''}${this.castling.b.k ? 'k' : ''}${this.castling.b.q ? 'q' : ''}` || '-';

    return `${placement} ${this.turn} ${castling} ${this.enPassant ?? '-'} ${this.halfmove} ${this.fullmove}`;
  }

  getLegalMoves(fromSquare = null) {
    const moves = this.generateLegalMoves(this.turn);
    if (!fromSquare) return moves;
    return moves.filter((move) => move.from === fromSquare);
  }

  move(input) {
    const legalMoves = this.generateLegalMoves(this.turn);
    const move = legalMoves.find(
      (candidate) =>
        candidate.from === input.from &&
        candidate.to === input.to &&
        (!candidate.promotion || (input.promotion || 'q') === candidate.promotion)
    );

    if (!move) return { ok: false, reason: 'Coup illégal' };

    const before = this.snapshot();
    this.applyMove(move);
    const check = this.isInCheck(this.turn);
    const status = this.getStatus();
    const san = this.toSAN(move, legalMoves, status);

    this.history.push({
      from: move.from,
      to: move.to,
      piece: move.piece.type,
      color: move.piece.color,
      san,
      fen: this.toFEN(),
      check,
      capture: !!move.capture,
      promotion: move.promotion || null,
      castling: move.castling || null,
      enPassant: !!move.enPassant,
      moveNumber: before.turn === 'w' ? before.fullmove : before.fullmove
    });

    return { ok: true, move: this.history.at(-1), status };
  }

  getStatus() {
    const active = this.turn;
    const inCheck = this.isInCheck(active);
    const legal = this.generateLegalMoves(active);
    if (!legal.length && inCheck) return { state: 'checkmate', winner: opposite(active), inCheck: active };
    if (!legal.length && !inCheck) return { state: 'stalemate', winner: null, inCheck: null };
    if (this.halfmove >= 100) return { state: 'draw-50', winner: null, inCheck: null };
    return { state: inCheck ? 'check' : 'active', winner: null, inCheck: inCheck ? active : null };
  }

  getPGN() {
    const chunks = [];
    for (let i = 0; i < this.history.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const white = this.history[i]?.san || '';
      const black = this.history[i + 1]?.san || '';
      chunks.push(`${moveNumber}. ${white}${black ? ` ${black}` : ''}`);
    }
    return chunks.join(' ');
  }

  snapshot() {
    return {
      board: cloneBoard(this.board),
      turn: this.turn,
      castling: JSON.parse(JSON.stringify(this.castling)),
      enPassant: this.enPassant,
      halfmove: this.halfmove,
      fullmove: this.fullmove
    };
  }

  restore(snapshot) {
    this.board = cloneBoard(snapshot.board);
    this.turn = snapshot.turn;
    this.castling = JSON.parse(JSON.stringify(snapshot.castling));
    this.enPassant = snapshot.enPassant;
    this.halfmove = snapshot.halfmove;
    this.fullmove = snapshot.fullmove;
  }

  generateLegalMoves(color) {
    const pseudo = this.generatePseudoMoves(color);
    const legal = [];

    pseudo.forEach((move) => {
      const snap = this.snapshot();
      this.applyMove(move, { switchTurn: false });
      const stillInCheck = this.isInCheck(color);
      this.restore(snap);
      if (!stillInCheck) legal.push(move);
    });

    return legal;
  }

  generatePseudoMoves(color) {
    const moves = [];

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== color) continue;

        const from = coordsToSquare(row, col);
        if (piece.type === 'p') {
          moves.push(...this.generatePawnMoves(row, col, from, piece));
        }

        if (piece.type === 'n' || piece.type === 'k') {
          PIECE_OFFSETS[piece.type].forEach(([dr, dc]) => {
            const nextRow = row + dr;
            const nextCol = col + dc;
            if (!inBounds(nextRow, nextCol)) return;
            const target = this.board[nextRow][nextCol];
            if (target?.color === color) return;
            moves.push({
              from,
              to: coordsToSquare(nextRow, nextCol),
              piece,
              capture: target || null
            });
          });
        }

        if (piece.type in SLIDERS) {
          SLIDERS[piece.type].forEach(([dr, dc]) => {
            let nextRow = row + dr;
            let nextCol = col + dc;
            while (inBounds(nextRow, nextCol)) {
              const target = this.board[nextRow][nextCol];
              if (target?.color === color) break;
              moves.push({
                from,
                to: coordsToSquare(nextRow, nextCol),
                piece,
                capture: target || null
              });
              if (target) break;
              nextRow += dr;
              nextCol += dc;
            }
          });
        }

        if (piece.type === 'k') {
          moves.push(...this.generateCastlingMoves(color, from));
        }
      }
    }

    return moves;
  }

  generatePawnMoves(row, col, from, piece) {
    const moves = [];
    const direction = piece.color === 'w' ? -1 : 1;
    const startRank = piece.color === 'w' ? 6 : 1;
    const promotionRank = piece.color === 'w' ? 0 : 7;

    const oneStepRow = row + direction;
    if (inBounds(oneStepRow, col) && !this.board[oneStepRow][col]) {
      if (oneStepRow === promotionRank) {
        ['q', 'r', 'b', 'n'].forEach((promotion) => {
          moves.push({ from, to: coordsToSquare(oneStepRow, col), piece, promotion });
        });
      } else {
        moves.push({ from, to: coordsToSquare(oneStepRow, col), piece });
      }

      const twoStepRow = row + direction * 2;
      if (row === startRank && !this.board[twoStepRow][col]) {
        moves.push({ from, to: coordsToSquare(twoStepRow, col), piece, doublePawn: true });
      }
    }

    [-1, 1].forEach((dc) => {
      const nextRow = row + direction;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol)) return;
      const target = this.board[nextRow][nextCol];
      const to = coordsToSquare(nextRow, nextCol);

      if (target && target.color !== piece.color) {
        if (nextRow === promotionRank) {
          ['q', 'r', 'b', 'n'].forEach((promotion) => {
            moves.push({ from, to, piece, capture: target, promotion });
          });
        } else {
          moves.push({ from, to, piece, capture: target });
        }
      }

      if (this.enPassant && this.enPassant === to) {
        const capturedPawn = this.board[row][nextCol];
        if (capturedPawn?.type === 'p' && capturedPawn.color !== piece.color) {
          moves.push({ from, to, piece, capture: capturedPawn, enPassant: true });
        }
      }
    });

    return moves;
  }

  generateCastlingMoves(color, from) {
    const row = color === 'w' ? 7 : 0;
    const moves = [];
    const king = this.board[row][4];
    if (!king || king.type !== 'k' || king.color !== color) return moves;
    if (this.isInCheck(color)) return moves;

    if (this.castling[color].k) {
      const rook = this.board[row][7];
      if (rook?.type === 'r' && rook.color === color && !this.board[row][5] && !this.board[row][6]) {
        if (!this.isSquareAttacked(coordsToSquare(row, 5), opposite(color)) && !this.isSquareAttacked(coordsToSquare(row, 6), opposite(color))) {
          moves.push({ from, to: coordsToSquare(row, 6), piece: king, castling: 'k' });
        }
      }
    }

    if (this.castling[color].q) {
      const rook = this.board[row][0];
      if (rook?.type === 'r' && rook.color === color && !this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
        if (!this.isSquareAttacked(coordsToSquare(row, 3), opposite(color)) && !this.isSquareAttacked(coordsToSquare(row, 2), opposite(color))) {
          moves.push({ from, to: coordsToSquare(row, 2), piece: king, castling: 'q' });
        }
      }
    }

    return moves;
  }

  applyMove(move, options = { switchTurn: true }) {
    const { row: fromRow, col: fromCol } = squareToCoords(move.from);
    const { row: toRow, col: toCol } = squareToCoords(move.to);
    const movingPiece = this.board[fromRow][fromCol];
    this.board[fromRow][fromCol] = null;

    if (move.enPassant) {
      const captureRow = movingPiece.color === 'w' ? toRow + 1 : toRow - 1;
      this.board[captureRow][toCol] = null;
    }

    if (move.castling) {
      if (move.castling === 'k') {
        this.board[toRow][5] = this.board[toRow][7];
        this.board[toRow][7] = null;
      } else {
        this.board[toRow][3] = this.board[toRow][0];
        this.board[toRow][0] = null;
      }
    }

    const placedPiece = move.promotion ? { color: movingPiece.color, type: move.promotion } : movingPiece;
    this.board[toRow][toCol] = placedPiece;

    this.updateCastlingRights(move, movingPiece);

    if (movingPiece.type === 'p' && Math.abs(toRow - fromRow) === 2) {
      this.enPassant = coordsToSquare((toRow + fromRow) / 2, fromCol);
    } else {
      this.enPassant = null;
    }

    if (movingPiece.type === 'p' || move.capture) {
      this.halfmove = 0;
    } else {
      this.halfmove += 1;
    }

    if (options.switchTurn) {
      if (this.turn === 'b') this.fullmove += 1;
      this.turn = opposite(this.turn);
    }
  }

  updateCastlingRights(move, piece) {
    const from = move.from;
    const to = move.to;

    if (piece.type === 'k') {
      this.castling[piece.color].k = false;
      this.castling[piece.color].q = false;
    }

    if (piece.type === 'r') {
      if (from === 'a1') this.castling.w.q = false;
      if (from === 'h1') this.castling.w.k = false;
      if (from === 'a8') this.castling.b.q = false;
      if (from === 'h8') this.castling.b.k = false;
    }

    if (move.capture) {
      if (to === 'a1') this.castling.w.q = false;
      if (to === 'h1') this.castling.w.k = false;
      if (to === 'a8') this.castling.b.q = false;
      if (to === 'h8') this.castling.b.k = false;
    }
  }

  isInCheck(color) {
    let kingSquare = null;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const piece = this.board[row][col];
        if (piece?.type === 'k' && piece.color === color) {
          kingSquare = coordsToSquare(row, col);
          break;
        }
      }
      if (kingSquare) break;
    }
    if (!kingSquare) return false;
    return this.isSquareAttacked(kingSquare, opposite(color));
  }

  isSquareAttacked(square, byColor) {
    const { row, col } = squareToCoords(square);

    const pawnDr = byColor === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const r = row + pawnDr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const pawn = this.board[r][c];
      if (pawn?.color === byColor && pawn.type === 'p') return true;
    }

    for (const [dr, dc] of PIECE_OFFSETS.n) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const piece = this.board[r][c];
      if (piece?.color === byColor && piece.type === 'n') return true;
    }

    for (const [dr, dc] of PIECE_OFFSETS.k) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const piece = this.board[r][c];
      if (piece?.color === byColor && piece.type === 'k') return true;
    }

    for (const [dr, dc] of [...SLIDERS.b, ...SLIDERS.r]) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const piece = this.board[r][c];
        if (piece) {
          if (piece.color === byColor) {
            const isDiag = Math.abs(dr) === Math.abs(dc);
            if ((isDiag && (piece.type === 'b' || piece.type === 'q')) || (!isDiag && (piece.type === 'r' || piece.type === 'q'))) {
              return true;
            }
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  toSAN(move, legalMovesBefore, status) {
    if (move.castling === 'k') return status.state === 'checkmate' ? 'O-O#' : this.withCheckSuffix('O-O', status);
    if (move.castling === 'q') return status.state === 'checkmate' ? 'O-O-O#' : this.withCheckSuffix('O-O-O', status);

    const pieceLetter = move.piece.type === 'p' ? '' : move.piece.type.toUpperCase();
    const captureMarker = move.capture ? 'x' : '';
    const fromFile = move.from[0];
    const disambiguation = this.getDisambiguation(move, legalMovesBefore);
    const destination = move.to;
    const promotion = move.promotion ? `=${move.promotion.toUpperCase()}` : '';
    const pawnPrefix = move.piece.type === 'p' && move.capture ? fromFile : '';

    const sanCore = `${pieceLetter}${disambiguation || pawnPrefix}${captureMarker}${destination}${promotion}`;
    return this.withCheckSuffix(sanCore, status);
  }

  withCheckSuffix(san, status) {
    if (status.state === 'checkmate') return `${san}#`;
    if (status.state === 'check') return `${san}+`;
    return san;
  }

  getDisambiguation(move, legalMoves) {
    if (move.piece.type === 'p' || move.piece.type === 'k') return '';
    const contenders = legalMoves.filter(
      (candidate) => candidate !== move && candidate.to === move.to && candidate.piece.type === move.piece.type
    );
    if (!contenders.length) return '';

    const sameFile = contenders.some((c) => c.from[0] === move.from[0]);
    const sameRank = contenders.some((c) => c.from[1] === move.from[1]);
    if (!sameFile) return move.from[0];
    if (!sameRank) return move.from[1];
    return move.from;
  }
}

export const DEFAULT_FEN = STANDARD_START;
export const DEMO_FEN = START_FEN;
