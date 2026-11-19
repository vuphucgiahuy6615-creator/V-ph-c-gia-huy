import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FolderCheck,
  HelpCircle,
  Lock,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Unlock,
  Volume2,
} from 'lucide-react';
import {
  GameStatus,
  ModelStatus,
  RecognitionSnapshot,
  VoiceClassCommand,
} from '../types/game';
import {
  CONFIDENCE_THRESHOLD,
  DEFAULT_LOCAL_MODEL_URL,
  isDirectionalCommand,
} from '../services/teachableMachine';

interface AiControlPanelProps {
  modelUrl: string;
  onModelUrlChange: (url: string) => void;
  onLoadModel: () => void;
  modelStatus: ModelStatus;
  modelError: string | null;
  wordLabels: string[];
  gameStatus: GameStatus;
  onStartGame: () => void;
  onStopListening: () => void;
  onReplay: () => void;
  commandLocked: boolean;
  isMoving: boolean;
  snapshot: RecognitionSnapshot | null;
  lastRecognizedTick: number;
  onOpenGuide: () => void;
}

function getDirectionIcon(command: VoiceClassCommand) {
  switch (command) {
    case 'UP':
      return <ArrowUp className="w-5 h-5" />;
    case 'DOWN':
      return <ArrowDown className="w-5 h-5" />;
    case 'LEFT':
      return <ArrowLeft className="w-5 h-5" />;
    case 'RIGHT':
      return <ArrowRight className="w-5 h-5" />;
    default:
      return <Volume2 className="w-5 h-5" />;
  }
}

/**
 * Bảng điều khiển AI Teachable Machine Audio (mặc định tải từ ./model/),
 * hiển thị trạng thái micro, sóng âm thanh, nút BẮT ĐẦU / CHƠI LẠI,
 * và độ tin cậy theo thời gian thực với ngưỡng 55%.
 */
export const AiControlPanel: React.FC<AiControlPanelProps> = ({
  modelUrl,
  onModelUrlChange,
  onLoadModel,
  modelStatus,
  modelError,
  wordLabels,
  gameStatus,
  onStartGame,
  onStopListening,
  onReplay,
  commandLocked,
  isMoving,
  snapshot,
  lastRecognizedTick,
  onOpenGuide,
}) => {
  const isListening = gameStatus === 'LISTENING';
  const isLoadingModel = modelStatus === 'LOADING';

  const isLowConfidence =
    Boolean(snapshot) &&
    snapshot!.confidence < CONFIDENCE_THRESHOLD;

  const isConfidentCommand =
    Boolean(snapshot) &&
    isDirectionalCommand(snapshot!.command) &&
    snapshot!.confidence >= CONFIDENCE_THRESHOLD;

  return (
    <div className="flex flex-col gap-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#cbe4c7] shadow-[0_8px_24px_rgba(20,40,29,0.06)]">
      {/* Phần 1: Kết nối mô hình Teachable Machine Audio */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-lg font-bold text-[#14281d]">
            Mô hình AI Teachable Machine
          </h2>
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Hướng dẫn</span>
          </button>
        </div>

        <label
          htmlFor="tm-model-url"
          className="block text-xs font-medium text-slate-600 mb-1.5"
        >
          Đường dẫn mô hình (mặc định đọc từ <code className="font-mono-nums">./model/</code>)
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="tm-model-url"
            type="text"
            value={modelUrl}
            onChange={(e) => onModelUrlChange(e.target.value)}
            disabled={isListening || isLoadingModel}
            placeholder="./model/ hoặc https://teachablemachine.withgoogle.com/models/h_tAjSKNG/"
            className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onLoadModel}
            disabled={isListening || isLoadingModel || !modelUrl.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 active:translate-y-0.5 transition-all whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingModel ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {/* Nút chuyển nhanh về mô hình ./model/ nếu người dùng đã nhập URL khác */}
        {modelUrl.trim() !== DEFAULT_LOCAL_MODEL_URL && !isListening && (
          <button
            type="button"
            onClick={() => onModelUrlChange(DEFAULT_LOCAL_MODEL_URL)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>Dùng lại mô hình chuẩn trong thư mục ./model/</span>
          </button>
        )}

        {/* Trạng thái mô hình AI */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-slate-500">Trạng thái AI:</span>
          {modelStatus === 'UNLOADED' && (
            <span className="font-semibold text-slate-700">
              Chưa tải mô hình
            </span>
          )}
          {modelStatus === 'LOADING' && (
            <span className="font-semibold text-amber-700">
              Đang kiểm tra và tải model.json, metadata.json, weights.bin...
            </span>
          )}
          {modelStatus === 'READY' && (
            <span className="font-semibold text-emerald-700">
              Đã nạp đủ 3 file mô hình ({wordLabels.join(', ')})
            </span>
          )}
          {modelStatus === 'ERROR' && (
            <span className="font-semibold text-rose-700">
              Lỗi tải mô hình
            </span>
          )}
        </div>

        {modelError && (
          <p
            role="alert"
            className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed"
          >
            {modelError}
          </p>
        )}
      </div>

      <hr className="border-emerald-100" />

      {/* Phần 2: Đèn báo trạng thái Micro, Sóng âm thanh & Nút BẮT ĐẦU / CHƠI LẠI */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-sm font-semibold text-slate-700">
            Trạng thái micro
          </span>

          {/* Đèn báo trạng thái micro: phát sáng + sóng âm thanh khi nghe, xám khi tắt */}
          <div
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
              isListening
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {isListening ? (
              <>
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-mic-glow">
                  <Mic className="w-3.5 h-3.5" />
                </span>
                <span>Đang nghe</span>
                {/* Sóng âm thanh chuyển động khi microphone hoạt động */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-0.5 h-3.5 ml-0.5"
                >
                  <span
                    className="w-0.5 h-full rounded-full bg-emerald-500 animate-ai-wave"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-0.5 h-full rounded-full bg-emerald-600 animate-ai-wave"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-0.5 h-full rounded-full bg-emerald-500 animate-ai-wave"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span
                    className="w-0.5 h-full rounded-full bg-emerald-600 animate-ai-wave"
                    style={{ animationDelay: '450ms' }}
                  />
                </span>
              </>
            ) : (
              <>
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                  <MicOff className="w-3.5 h-3.5" />
                </span>
                <span>Đã tắt</span>
              </>
            )}
          </div>
        </div>

        {/* Hai nút điều khiển chính: BẮT ĐẦU & CHƠI LẠI */}
        <div className="grid grid-cols-2 gap-3">
          {!isListening ? (
            <button
              type="button"
              onClick={onStartGame}
              disabled={isLoadingModel || gameStatus === 'WON'}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-base font-extrabold bg-orange-500 text-white border-b-4 border-orange-700 hover:bg-orange-600 active:translate-y-0.5 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>BẮT ĐẦU</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopListening}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-base font-extrabold bg-rose-600 text-white border-b-4 border-rose-800 hover:bg-rose-700 active:translate-y-0.5 transition-all whitespace-nowrap cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>TẠM DỪNG</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-base font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-300 border-b-4 border-b-emerald-400 hover:bg-emerald-100 active:translate-y-0.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>CHƠI LẠI</span>
          </button>
        </div>
      </div>

      <hr className="border-emerald-100" />

      {/* Phần 3: Hiển thị lớp âm thanh nhận diện & độ tin cậy AI */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-[#14281d]">
            Khẩu lệnh AI nhận diện
          </h3>

          {/* Chỉ báo khóa chống nhận diện lặp & khóa khi đang bay */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              isMoving || commandLocked ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {isMoving ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Bé Lạc đang di chuyển...</span>
              </>
            ) : commandLocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Đã khóa (chờ Background Noise)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Sẵn sàng nhận lệnh</span>
              </>
            )}
          </span>
        </div>

        {/* Ô hiển thị khẩu lệnh vừa nhận kèm animation nổi bật */}
        <div
          key={isConfidentCommand ? `cmd-${lastRecognizedTick}` : 'cmd-idle'}
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
            isConfidentCommand
              ? 'bg-orange-50/80 border-orange-300 animate-command-pop'
              : 'bg-[#f4faf3] border-[#cde6ca]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isConfidentCommand
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-emerald-800 border border-emerald-200'
              }`}
            >
              {snapshot ? (
                getDirectionIcon(snapshot.command)
              ) : (
                <MicOff className="w-5 h-5 opacity-60" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 font-medium">
                Lớp âm thanh nhận diện
              </div>
              <div className="text-lg font-extrabold text-[#14281d] truncate">
                {!snapshot
                  ? 'Đang chờ bắt đầu'
                  : isLowConfidence
                    ? 'Chưa nhận diện rõ'
                    : snapshot.displayLabel}
              </div>
              {snapshot && isLowConfidence && (
                <div className="text-xs text-amber-700 font-medium truncate">
                  Gần nhất: {snapshot.rawLabel} (&lt; 55%)
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-500 font-medium">
              Độ tin cậy
            </div>
            <div
              className={`text-xl font-bold font-mono-nums ${
                isConfidentCommand ? 'text-orange-600' : 'text-emerald-800'
              }`}
            >
              {snapshot ? `${Math.round(snapshot.confidence * 100)}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Thanh xác suất chi tiết từng lớp từ Teachable Machine (Ngưỡng 55%) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Phân tích 5 lớp âm thanh</span>
            <span className="font-mono-nums font-semibold text-emerald-800">
              Ngưỡng di chuyển: 55%
            </span>
          </div>

          {snapshot && snapshot.probabilities.length > 0 ? (
            <div className="flex flex-col gap-2">
              {snapshot.probabilities.map((item) => {
                const percent = Math.round(item.score * 100);
                const isDirectional =
                  item.command !== 'IDLE' && item.command !== 'UNKNOWN';
                const passedThreshold =
                  isDirectional && item.score >= CONFIDENCE_THRESHOLD;

                return (
                  <div key={item.label} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700 truncate">
                        {item.label}
                      </span>
                      <span className="font-mono-nums font-semibold text-slate-700">
                        {percent}%
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      {/* Vạch mốc 55% */}
                      <div
                        aria-hidden="true"
                        className="absolute top-0 bottom-0 left-[55%] w-0.5 bg-slate-500/70 z-10"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          passedThreshold
                            ? 'bg-orange-500'
                            : item.command === 'IDLE'
                              ? 'bg-slate-400'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-3 text-xs text-slate-600 leading-relaxed">
              {modelStatus === 'READY'
                ? 'Mô hình đã sẵn sàng. Nhấn nút BẮT ĐẦU và cấp quyền micro để bắt đầu điều khiển Bé Lạc bằng giọng nói.'
                : 'Đang chuẩn bị kết nối mô hình Teachable Machine...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
