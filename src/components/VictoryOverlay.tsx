import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface VictoryOverlayProps {
  stepsCount: number;
  onReplay: () => void;
}

const CELEBRATION_ITEMS = ['🪶', '🎉', '✨', '🌿', '⭐', '🪶', '🎊'];

/**
 * Màn hình chúc mừng khi Bé Lạc về đến tổ an toàn:
 * pháo hoa, lông chim bay xung quanh, tổ phát sáng và Bé Lạc nhảy vui vẻ vỗ cánh.
 */
export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  stepsCount,
  onReplay,
}) => {
  const [imgError, setImgError] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        symbol: CELEBRATION_ITEMS[i % CELEBRATION_ITEMS.length],
        left: `${(i * 3.9 + 2) % 96}%`,
        duration: `${2.6 + (i % 5) * 0.6}s`,
        delay: `${(i % 6) * 0.22}s`,
        size: i % 2 === 0 ? 'text-2xl' : 'text-xl',
      })),
    []
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 backdrop-blur-sm p-4 overflow-hidden"
    >
      {/* Hiệu ứng pháo hoa và những chiếc lông chim bay xung quanh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className={`absolute -top-10 animate-feather-fall ${p.size}`}
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>

      {/* Hộp thông báo chiến thắng */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 sm:p-8 text-center border-2 border-amber-300 shadow-[0_24px_48px_rgba(20,40,29,0.28)] animate-command-pop">
        {/* Tổ phát sáng + Bé Lạc nhảy vui vẻ và vỗ cánh */}
        <div className="relative mx-auto w-32 h-32 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center mb-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-amber-300/45 blur-md animate-nest-glow"
          />

          <div className="relative flex items-center justify-center animate-belac-victory">
            {/* Cánh trái vỗ vui vẻ */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="absolute -left-3 top-1/3 w-5 h-5 text-orange-400 animate-wing-flap-loop-left"
            >
              <path
                d="M22 12 C14 4, 4 6, 2 14 C8 16, 16 15, 22 12 Z"
                fill="currentColor"
                stroke="#9a3412"
                strokeWidth="1.5"
              />
            </svg>
            {/* Cánh phải vỗ vui vẻ */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="absolute -right-3 top-1/3 w-5 h-5 text-orange-400 animate-wing-flap-loop-right"
            >
              <path
                d="M2 12 C10 4, 20 6, 22 14 C16 16, 8 15, 2 12 Z"
                fill="currentColor"
                stroke="#9a3412"
                strokeWidth="1.5"
              />
            </svg>

            {!imgError ? (
              <img
                src="/assets/aistudio/image_dbd04a60.png"
                alt="Bé Lạc vui mừng về tới tổ"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="relative w-24 h-24 object-contain"
              />
            ) : (
              <span className="relative text-5xl">🐣</span>
            )}
          </div>
        </div>

        <h2
          id="victory-title"
          className="text-2xl sm:text-3xl font-extrabold text-emerald-900 leading-tight"
        >
          🎉 Bé Lạc đã về tổ!
        </h2>

        <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
          Tuyệt vời! Bạn đã dẫn đường cho Bé Lạc vượt qua các tảng đá và trở về
          tổ ấm an toàn sau{' '}
          <strong className="font-mono-nums text-orange-600">
            {stepsCount} bước
          </strong>
          .
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-extrabold bg-orange-500 text-white border-b-4 border-orange-700 hover:bg-orange-600 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>CHƠI LẠI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
