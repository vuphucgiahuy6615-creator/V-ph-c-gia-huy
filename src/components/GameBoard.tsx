import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';
import { CellType, Direction, FeedbackBanner, Position } from '../types/game';
import { GRID_SIZE, NEST_POSITION } from '../utils/mapGenerator';

interface GameBoardProps {
  grid: CellType[][];
  playerPos: Position;
  visitedKeys: string[];
  moveTick: number;
  bumpTick: number;
  isMoving: boolean;
  isBumping: boolean;
  blockedCell: Position | null;
  lastCommandDir: Direction | null;
  feedback: FeedbackBanner | null;
  isListening: boolean;
  hasWon: boolean;
}

function getDirectionalAnimClass(dir: Direction | null): string {
  switch (dir) {
    case 'UP':
      return 'animate-belac-move-up';
    case 'DOWN':
      return 'animate-belac-move-down';
    case 'LEFT':
      return 'animate-belac-move-left';
    case 'RIGHT':
      return 'animate-belac-move-right';
    default:
      return 'animate-belac-move-right';
  }
}

function getMoveArrowIcon(dir: Direction | null) {
  switch (dir) {
    case 'UP':
      return <ArrowUp className="w-4 h-4" />;
    case 'DOWN':
      return <ArrowDown className="w-4 h-4" />;
    case 'LEFT':
      return <ArrowLeft className="w-4 h-4" />;
    case 'RIGHT':
      return <ArrowRight className="w-4 h-4" />;
    default:
      return null;
  }
}

/**
 * Bản đồ khu rừng 6x6 nâng cấp trực quan:
 * Khung gỗ dây leo, cây góc đung đưa, cỏ hoa thiên nhiên, đá phản sáng có bóng,
 * tổ phát sáng vàng và chuyển động Bé Lạc 300ms mượt mà từ tâm ô cũ đến tâm ô mới.
 */
export const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  playerPos,
  visitedKeys,
  moveTick,
  bumpTick,
  isMoving,
  isBumping,
  blockedCell,
  lastCommandDir,
  feedback,
  isListening,
  hasWon,
}) => {
  const [imgError, setImgError] = useState(false);

  const distanceToNest =
    Math.abs(playerPos.row - NEST_POSITION.row) +
    Math.abs(playerPos.col - NEST_POSITION.col);
  const isNearNest = distanceToNest <= 2 || hasWon;

  const characterAnimClass = hasWon
    ? 'animate-belac-victory'
    : isBumping
      ? 'animate-belac-bump'
      : isMoving
        ? getDirectionalAnimClass(lastCommandDir)
        : 'animate-belac-bob';

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* Khung gỗ khu rừng 2D với dây leo và cây cối ở các góc */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#915b34] to-[#744524] p-3 sm:p-4 shadow-[0_16px_36px_rgba(20,40,29,0.18)] border-b-[7px] border-[#533018] ring-1 ring-[#b57a4e]/40">
        {/* Dây leo trang trí chạy dọc khung gỗ trên và dưới (không che lưới) */}
        <svg
          viewBox="0 0 400 22"
          aria-hidden="true"
          className="pointer-events-none absolute -top-1.5 left-10 right-10 w-[calc(100%-5rem)] h-5 z-10"
        >
          <path
            d="M0 12 Q55 3 110 12 T220 11 T330 12 T400 9"
            fill="none"
            stroke="#4d8b31"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="85" cy="9" r="3.5" fill="#fff" />
          <circle cx="85" cy="9" r="1.4" fill="#f59e0b" />
          <circle cx="240" cy="11" r="3.5" fill="#fff" />
          <circle cx="240" cy="11" r="1.4" fill="#f59e0b" />
          <circle cx="155" cy="12" r="2.8" fill="#ef4444" />
          <circle cx="325" cy="11" r="2.8" fill="#ef4444" />
        </svg>

        {/* Cây cối ở góc bản đồ lay nhẹ */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 -left-4 z-20 text-3xl sm:text-4xl drop-shadow-sm animate-forest-sway"
        >
          🌳
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 -right-4 z-20 text-3xl sm:text-4xl drop-shadow-sm animate-forest-sway"
          style={{ animationDelay: '1.1s' }}
        >
          🌲
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 -left-3 z-20 text-2xl sm:text-3xl drop-shadow-sm animate-forest-sway"
          style={{ animationDelay: '0.6s' }}
        >
          🌳
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 -right-2 z-20 text-xl sm:text-2xl animate-forest-sway"
          style={{ animationDelay: '1.6s' }}
        >
          🌿
        </div>

        {/* Lưới 6x6 ô vuông đồng đều */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#4f2e16]/60 bg-[#77bd43] shadow-inner">
          <div className="grid grid-cols-6 w-full">
            {grid.map((rowCells, rIdx) =>
              rowCells.map((cell, cIdx) => {
                const isEven = (rIdx + cIdx) % 2 === 0;
                const cellKey = `${rIdx}-${cIdx}`;
                const isVisited = visitedKeys.includes(cellKey);
                const isBlockedFlash =
                  blockedCell?.row === rIdx && blockedCell?.col === cIdx;
                const isPlayerHere =
                  playerPos.row === rIdx && playerPos.col === cIdx;

                return (
                  <div
                    key={cellKey}
                    aria-label={`Ô hàng ${rIdx + 1} cột ${cIdx + 1}: ${
                      cell === 'ROCK'
                        ? 'Tảng đá'
                        : cell === 'NEST'
                          ? 'Chiếc tổ'
                          : cell === 'START'
                            ? 'Điểm xuất phát'
                            : 'Đường cỏ'
                    }`}
                    className={`relative aspect-square flex items-center justify-center border border-[#4c8624]/25 transition-colors duration-300 ${
                      isBlockedFlash
                        ? 'ring-4 ring-inset ring-rose-500 bg-rose-200/80'
                        : isEven
                          ? 'bg-[#8ad055]'
                          : 'bg-[#78be44]'
                    }`}
                  >
                    {/* Hiệu ứng sáng nhẹ trên các ô Bé Lạc vừa đi qua */}
                    {isVisited && cell !== 'ROCK' && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-1 rounded-xl bg-amber-100/45 shadow-[inset_0_0_10px_rgba(254,240,138,0.65)] animate-tile-glow"
                      />
                    )}

                    {/* Hoa cỏ thiên nhiên sống động trên ô đường đi */}
                    {cell === 'PATH' && (
                      <div className="relative flex items-center justify-center w-full h-full">
                        {(rIdx * 3 + cIdx) % 4 === 1 && (
                          <span
                            aria-hidden="true"
                            className="text-sm sm:text-base opacity-85 animate-forest-sway pointer-events-none"
                            style={{ animationDelay: `${(rIdx + cIdx) * 0.28}s` }}
                          >
                            🌿
                          </span>
                        )}
                        {(rIdx + cIdx * 3) % 7 === 2 && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-1.5 right-1.5 text-[10px] sm:text-xs opacity-90 pointer-events-none"
                          >
                            🌼
                          </span>
                        )}
                        {isVisited && !isPlayerHere && (
                          <span
                            aria-hidden="true"
                            className="absolute w-2.5 h-2.5 rounded-full bg-amber-200/90 ring-4 ring-amber-300/40"
                          />
                        )}
                      </div>
                    )}

                    {/* Điểm xuất phát ở góc trên trái */}
                    {cell === 'START' && (
                      <div className="relative flex flex-col items-center justify-center">
                        <span className="text-[10px] sm:text-xs font-extrabold text-emerald-950/75 bg-white/55 px-1.5 py-0.5 rounded-md">
                          Xuất phát
                        </span>
                      </div>
                    )}

                    {/* Tảng đá chướng ngại vật: có đổ bóng, rung cực nhẹ, phản sáng và rung + cảnh báo khi va chạm */}
                    {cell === 'ROCK' && (
                      <div
                        className={`relative w-[84%] h-[84%] flex items-center justify-center ${
                          isBlockedFlash ? 'animate-rock-bump' : 'animate-rock-idle'
                        }`}
                        style={{
                          animationDelay: isBlockedFlash
                            ? '0ms'
                            : `${(rIdx + cIdx) * 0.35}s`,
                        }}
                      >
                        <svg
                          viewBox="0 0 80 80"
                          className="w-full h-full drop-shadow-[0_6px_6px_rgba(20,40,29,0.28)]"
                          aria-hidden="true"
                        >
                          {/* Bóng đổ dưới tảng đá */}
                          <ellipse
                            cx="40"
                            cy="68"
                            rx="29"
                            ry="7.5"
                            fill="#2d521a"
                            opacity="0.42"
                          />
                          {/* Thân đá 2D sắc nét */}
                          <path
                            d="M13 58 C9 42, 18 23, 34 18 C49 13, 66 24, 69 43 C71 58, 61 65, 42 65 C24 65, 16 63, 13 58 Z"
                            fill="#7b8994"
                            stroke="#3b4754"
                            strokeWidth="3"
                          />
                          {/* Mảng sáng tự nhiên trên đá */}
                          <path
                            d="M22 36 C27 25, 41 20, 53 24 C45 28, 35 33, 27 42 Z"
                            fill="#adb9c2"
                          />
                          {/* Ánh phản sáng nhẹ lấp lánh trên mặt đá */}
                          <path
                            d="M27 29 L38 23"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className="animate-rock-glint"
                          />
                          {/* Rêu xanh trên đá */}
                          <path
                            d="M28 20 C34 16, 45 16, 51 21 C46 24, 36 24, 28 20 Z"
                            fill="#58a545"
                          />
                          <path
                            d="M52 54 C57 50, 64 52, 65 57 C60 60, 55 59, 52 54 Z"
                            fill="#4d943c"
                          />
                        </svg>

                        {isBlockedFlash && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md animate-warning-pop"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    )}

                    {/* Chiếc tổ đích đến nổi bật: ánh sáng vàng xung quanh, nhịp nhàng, sáng mạnh khi Bé Lạc đến gần */}
                    {cell === 'NEST' && (
                      <div
                        className={`relative w-[90%] h-[90%] flex items-center justify-center ${
                          isNearNest ? 'animate-nest-wobble' : 'animate-nest-idle'
                        }`}
                      >
                        {/* Hào quang ánh sáng vàng xung quanh chiếc tổ */}
                        <div
                          className={`absolute -inset-1 rounded-full blur-xs animate-nest-glow ${
                            isNearNest
                              ? 'bg-amber-300/85 ring-4 ring-amber-200/70'
                              : 'bg-amber-200/65'
                          }`}
                        />

                        {/* Các đốm sáng vàng nhỏ quanh tổ */}
                        <span
                          aria-hidden="true"
                          className="absolute -top-0.5 left-2 text-[10px] text-amber-100 animate-pulse"
                        >
                          ✦
                        </span>
                        <span
                          aria-hidden="true"
                          className="absolute top-1 right-1.5 text-[10px] text-yellow-200 animate-pulse"
                          style={{ animationDelay: '0.5s' }}
                        >
                          ✦
                        </span>

                        <svg
                          viewBox="0 0 88 88"
                          className="relative w-full h-full drop-shadow-[0_5px_8px_rgba(120,66,18,0.35)]"
                          aria-hidden="true"
                        >
                          <circle
                            cx="44"
                            cy="47"
                            r="34"
                            fill="#fef08a"
                            opacity={isNearNest ? '0.9' : '0.6'}
                          />
                          <ellipse cx="44" cy="46" rx="28" ry="13" fill="#9a5b25" />
                          {!hasWon && (
                            <>
                              <ellipse
                                cx="37"
                                cy="42"
                                rx="6"
                                ry="8"
                                fill="#fffdf2"
                                stroke="#f59e0b"
                                strokeWidth="1.6"
                              />
                              <ellipse
                                cx="49"
                                cy="43"
                                rx="5.5"
                                ry="7.5"
                                fill="#fef9c3"
                                stroke="#f59e0b"
                                strokeWidth="1.6"
                              />
                            </>
                          )}
                          <path
                            d="M14 46 C14 66, 74 66, 74 46 C64 55, 24 55, 14 46 Z"
                            fill="#b46a2c"
                            stroke="#78350f"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M21 53 Q44 61 67 53"
                            fill="none"
                            stroke="#78350f"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M27 59 Q44 65 61 59"
                            fill="none"
                            stroke="#78350f"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute -bottom-0.5 text-[10px] sm:text-xs font-extrabold text-amber-950 bg-amber-100/95 px-1.5 rounded shadow-xs">
                          Tổ 🪺
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Lớp nhân vật Bé Lạc: di chuyển mượt mà 300ms từ tâm ô cũ đến tâm ô mới */}
          <div
            className="pointer-events-none absolute top-0 left-0 z-20 flex items-center justify-center p-1 sm:p-1.5"
            style={{
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              transform: `translate3d(${playerPos.col * 100}%, ${
                playerPos.row * 100
              }%, 0)`,
              transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Vòng sóng phản hồi khi AI vừa nhận diện khẩu lệnh thành công */}
            {moveTick > 0 && (
              <span
                key={`ripple-${moveTick}`}
                className="absolute inset-1.5 rounded-full border-2 border-orange-300 animate-command-ripple"
              />
            )}

            {/* Chỉ báo mũi tên hướng di chuyển thoáng nhẹ khi đang bước */}
            {isMoving && lastCommandDir && (
              <div
                key={`dir-${moveTick}`}
                className="absolute -top-2.5 right-0 z-30 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md animate-dir-hint"
              >
                {getMoveArrowIcon(lastCommandDir)}
              </div>
            )}

            {/* Biểu tượng cảnh báo nhỏ khi va vào đá hoặc mép bản đồ */}
            {isBumping && (
              <div
                key={`warn-${bumpTick}`}
                className="absolute -top-3 z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white shadow-md animate-warning-pop"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Container animation nhân vật (giữ nguyên tỷ lệ, không biến dạng) */}
            <div
              key={`anim-${moveTick}-${bumpTick}`}
              className={`relative w-full h-full flex items-center justify-center ${characterAnimClass}`}
            >
              {/* Bóng tròn dưới chân Bé Lạc */}
              <div className="absolute bottom-0.5 w-3/4 h-2.5 rounded-full bg-emerald-950/25 blur-[1px]" />

              {/* Hiệu ứng hai cánh vỗ nhẹ khi di chuyển hoặc chiến thắng */}
              {(isMoving || hasWon) && (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`absolute -left-1.5 top-1/3 w-4 h-4 text-orange-400 drop-shadow-xs ${
                      hasWon
                        ? 'animate-wing-flap-loop-left'
                        : 'animate-wing-flap-left'
                    }`}
                  >
                    <path
                      d="M22 12 C14 4, 4 6, 2 14 C8 16, 16 15, 22 12 Z"
                      fill="currentColor"
                      stroke="#9a3412"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`absolute -right-1.5 top-1/3 w-4 h-4 text-orange-400 drop-shadow-xs ${
                      hasWon
                        ? 'animate-wing-flap-loop-right'
                        : 'animate-wing-flap-right'
                    }`}
                  >
                    <path
                      d="M2 12 C10 4, 20 6, 22 14 C16 16, 8 15, 2 12 Z"
                      fill="currentColor"
                      stroke="#9a3412"
                      strokeWidth="1.5"
                    />
                  </svg>
                </>
              )}

              {!imgError ? (
                <div className="relative w-[92%] h-[92%] flex items-center justify-center">
                  <img
                    src="/assets/aistudio/image_dbd04a60.png"
                    alt="Bé Lạc - Chú chim non đeo tai nghe"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className={`w-full h-full object-contain drop-shadow-[0_6px_7px_rgba(20,40,29,0.3)] ${
                      isListening ? 'brightness-105' : ''
                    }`}
                  />
                  {/* Hiệu ứng chớp mắt tự nhiên khi Bé Lạc đứng yên chờ lệnh */}
                  {!isMoving && !isBumping && !hasWon && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-[41%] left-[32%] right-[30%] flex justify-between px-[3%]"
                    >
                      <span className="w-[24%] h-1.5 rounded-full bg-[#fb923c] animate-belac-blink" />
                      <span className="w-[24%] h-1.5 rounded-full bg-[#fb923c] animate-belac-blink" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-orange-400 border-2 border-orange-700 flex items-center justify-center text-3xl shadow-md">
                  🐣
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thanh thông báo phản hồi tức thì bên dưới bản đồ */}
      <div className="mt-3 min-h-[42px] flex items-center justify-center">
        {feedback ? (
          <div
            key={feedback.id}
            role="status"
            aria-live="polite"
            className={`px-4 py-2 rounded-xl text-sm font-semibold border animate-command-pop ${
              feedback.type === 'blocked'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : feedback.type === 'move'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : feedback.type === 'win'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-white text-slate-700 border-emerald-200/80'
            }`}
          >
            {feedback.message}
          </div>
        ) : (
          <p className="text-sm text-emerald-900/75 text-center">
            Hãy đọc rõ <strong>&ldquo;Lên&rdquo;</strong>,{' '}
            <strong>&ldquo;Xuống&rdquo;</strong>,{' '}
            <strong>&ldquo;Sang trái&rdquo;</strong> hoặc{' '}
            <strong>&ldquo;Sang phải&rdquo;</strong> để dẫn Bé Lạc về tổ.
          </p>
        )}
      </div>
    </div>
  );
};
