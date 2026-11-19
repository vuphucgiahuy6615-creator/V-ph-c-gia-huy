import { CellType, Position } from '../types/game';

export const GRID_SIZE = 6;

// Vị trí xuất phát cố định ở góc trên bên trái (0, 0)
export const START_POSITION: Position = { row: 0, col: 0 };

// Vị trí chiếc tổ cố định ở góc dưới bên phải (5, 5)
export const NEST_POSITION: Position = { row: GRID_SIZE - 1, col: GRID_SIZE - 1 };

/**
 * Bản đồ rừng mặc định 6x6 có thiết kế cân đối:
 * - Góc trên trái (0,0): Điểm xuất phát của Bé Lạc
 * - Góc dưới phải (5,5): Chiếc tổ ấm áp
 * - Có 7 tảng đá tạo đường đi uốn lượn thú vị, luôn đảm bảo đi được bằng 4 hướng
 */
export function createDefaultMap(): CellType[][] {
  const grid: CellType[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'PATH' as CellType)
  );

  const rockCoords: Position[] = [
    { row: 0, col: 3 },
    { row: 1, col: 1 },
    { row: 1, col: 3 },
    { row: 2, col: 5 },
    { row: 3, col: 2 },
    { row: 3, col: 4 },
    { row: 4, col: 0 },
    { row: 4, col: 2 },
  ];

  for (const { row, col } of rockCoords) {
    grid[row][col] = 'ROCK';
  }

  grid[START_POSITION.row][START_POSITION.col] = 'START';
  grid[NEST_POSITION.row][NEST_POSITION.col] = 'NEST';

  return grid;
}

/**
 * Thuật toán tìm kiếm theo chiều rộng (BFS) để kiểm tra xem
 * luôn tồn tại ít nhất một đường đi hợp lệ từ Bé Lạc (0,0) tới Chiếc tổ (5,5).
 */
export function hasValidPath(grid: CellType[][]): boolean {
  const visited = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );

  const queue: Position[] = [{ ...START_POSITION }];
  visited[START_POSITION.row][START_POSITION.col] = true;

  const directions: Position[] = [
    { row: -1, col: 0 }, // Lên
    { row: 1, col: 0 },  // Xuống
    { row: 0, col: -1 }, // Trái
    { row: 0, col: 1 },  // Phải
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (
      current.row === NEST_POSITION.row &&
      current.col === NEST_POSITION.col
    ) {
      return true;
    }

    for (const dir of directions) {
      const nextRow = current.row + dir.row;
      const nextCol = current.col + dir.col;

      if (
        nextRow >= 0 &&
        nextRow < GRID_SIZE &&
        nextCol >= 0 &&
        nextCol < GRID_SIZE &&
        !visited[nextRow][nextCol] &&
        grid[nextRow][nextCol] !== 'ROCK'
      ) {
        visited[nextRow][nextCol] = true;
        queue.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return false;
}

/**
 * Tạo bản đồ ngẫu nhiên 6x6 mới với số lượng tảng đá từ 6 đến 8 viên.
 * Luôn kiểm tra bằng BFS để đảm bảo có đường về tổ.
 */
export function generateRandomSolvableMap(rockCount = 7): CellType[][] {
  const safeRockCount = Math.max(2, Math.min(12, rockCount));

  for (let attempt = 0; attempt < 200; attempt++) {
    const grid: CellType[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 'PATH' as CellType)
    );

    let placed = 0;
    while (placed < safeRockCount) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      const isStart = row === START_POSITION.row && col === START_POSITION.col;
      const isNest = row === NEST_POSITION.row && col === NEST_POSITION.col;

      if (!isStart && !isNest && grid[row][col] === 'PATH') {
        grid[row][col] = 'ROCK';
        placed++;
      }
    }

    grid[START_POSITION.row][START_POSITION.col] = 'START';
    grid[NEST_POSITION.row][NEST_POSITION.col] = 'NEST';

    if (hasValidPath(grid)) {
      return grid;
    }
  }

  // Dự phòng an toàn nếu ngẫu nhiên vượt quá số lần thử
  return createDefaultMap();
}
