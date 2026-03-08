export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function squareToCoords(square) {
  const file = FILES.indexOf(square[0]);
  const rank = 8 - Number(square[1]);
  return { row: rank, col: file };
}

export function coordsToSquare(row, col) {
  return `${FILES[col]}${8 - row}`;
}

export function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}
