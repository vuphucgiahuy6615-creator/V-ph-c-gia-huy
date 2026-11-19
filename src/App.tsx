import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as speechCommands from '@tensorflow-models/speech-commands';
import {
  Compass,
  HelpCircle,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AiControlPanel } from './components/AiControlPanel';
import { GameBoard } from './components/GameBoard';
import { GuideModal } from './components/GuideModal';
import { VictoryOverlay } from './components/VictoryOverlay';
import { soundEffects } from './services/soundEffects';
import {
  CONFIDENCE_THRESHOLD,
  DEFAULT_LOCAL_MODEL_URL,
  buildRecognitionSnapshot,
  isDirectionalCommand,
  loadTeachableMachineModel,
  normalizeModelUrl,
} from './services/teachableMachine';
import {
  CellType,
  Direction,
  FeedbackBanner,
  GameStatus,
  ModelStatus,
  Position,
  RecognitionSnapshot,
} from './types/game';
import {
  GRID_SIZE,
  NEST_POSITION,
  START_POSITION,
  createDefaultMap,
  generateRandomSolvableMap,
} from './utils/mapGenerator';

const STORAGE_MODEL_URL_KEY = 'belac_tm_model_url_v2';
const SILENCE_UNLOCK_MS = 1200;
const UNLOCK_NOISE_THRESHOLD = 0.5;
const MOVE_ANIMATION_MS = 310;
const BUMP_ANIMATION_MS = 350;

const DIRECTION_VI: Record<Direction, string> = {
  UP: 'Lên ⬆️',
  DOWN: 'Xuống ⬇️',
  LEFT: 'Sang trái ⬅️',
  RIGHT: 'Sang phải ➡️',
};

export default function App() {
  // Trạng thái bản đồ 6x6 (giữ nguyên vị trí đá & tổ mặc định) và nhân vật Bé Lạc
  const [grid, setGrid] = useState<CellType[][]>(() => createDefaultMap());
  const [playerPos, setPlayerPos] = useState<Position>({ ...START_POSITION });
  const [visitedKeys, setVisitedKeys] = useState<string[]>([
    `${START_POSITION.row}-${START_POSITION.col}`,
  ]);
  const [stepsCount, setStepsCount] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('IDLE');

  // Hiệu ứng chuyển động & va chạm
  const [moveTick, setMoveTick] = useState(0);
  const [bumpTick, setBumpTick] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [blockedCell, setBlockedCell] = useState<Position | null>(null);
  const [lastCommandDir, setLastCommandDir] = useState<Direction | null>(null);
  const [lastRecognizedTick, setLastRecognizedTick] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

  // Trạng thái kết nối Teachable Machine Audio (mặc định đọc từ ./model/)
  const [modelUrl, setModelUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_MODEL_URL_KEY) || DEFAULT_LOCAL_MODEL_URL;
    } catch {
      return DEFAULT_LOCAL_MODEL_URL;
    }
  });
  const [loadedModelBaseUrl, setLoadedModelBaseUrl] = useState<string | null>(
    null
  );
  const [modelStatus, setModelStatus] = useState<ModelStatus>('UNLOADED');
  const [modelError, setModelError] = useState<string | null>(null);
  const [wordLabels, setWordLabels] = useState<string[]>([]);

  // Trạng thái nhận diện giọng nói và khóa chống lặp
  const [commandLocked, setCommandLocked] = useState(false);
  const [snapshot, setSnapshot] = useState<RecognitionSnapshot | null>(null);

  // Tùy chọn âm thanh và hướng dẫn
  const [isMuted, setIsMuted] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Các ref đồng bộ state mới nhất cho callback của Teachable Machine
  const recognizerRef = useRef<speechCommands.SpeechCommandRecognizer | null>(
    null
  );
  const wordLabelsRef = useRef<string[]>([]);
  const gridRef = useRef<CellType[][]>(grid);
  const playerPosRef = useRef<Position>(playerPos);
  const gameStatusRef = useRef<GameStatus>(gameStatus);
  const commandLockedRef = useRef<boolean>(commandLocked);
  const isMovingRef = useRef<boolean>(false);
  const lastDirectionalActiveAtRef = useRef<number>(0);
  const moveTimerRef = useRef<number | null>(null);
  const bumpTimerRef = useRef<number | null>(null);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  // Danh sách lá rừng bay chậm trong nền
  const backgroundLeaves = useMemo(
    () => [
      { id: 1, left: '8%', duration: '14s', delay: '0s', symbol: '🍃' },
      { id: 2, left: '26%', duration: '18s', delay: '3.5s', symbol: '🌿' },
      { id: 3, left: '62%', duration: '16s', delay: '1.8s', symbol: '🍃' },
      { id: 4, left: '84%', duration: '20s', delay: '5s', symbol: '🍂' },
    ],
    []
  );

  /**
   * Dừng lắng nghe micro an toàn
   */
  const stopListeningInternal = useCallback(async () => {
    const recognizer = recognizerRef.current;
    if (recognizer && recognizer.isListening()) {
      try {
        await recognizer.stopListening();
      } catch {
        // Bỏ qua nếu luồng nghe đã dừng trước đó
      }
    }
    commandLockedRef.current = false;
    setCommandLocked(false);
  }, []);

  /**
   * Thực hiện di chuyển Bé Lạc đúng 1 ô theo hướng chỉ định.
   * Khóa nhận lệnh trong suốt 310ms animation di chuyển để không nhảy đúp.
   */
  const attemptMove = useCallback(
    (direction: Direction) => {
      if (gameStatusRef.current === 'WON') return;
      if (isMovingRef.current) return;

      const currentPos = playerPosRef.current;
      const currentGrid = gridRef.current;

      const deltaMap: Record<Direction, Position> = {
        UP: { row: -1, col: 0 },
        DOWN: { row: 1, col: 0 },
        LEFT: { row: 0, col: -1 },
        RIGHT: { row: 0, col: 1 },
      };

      const delta = deltaMap[direction];
      const nextRow = currentPos.row + delta.row;
      const nextCol = currentPos.col + delta.col;

      // 1. Kiểm tra vượt ra ngoài bản đồ 6x6
      if (
        nextRow < 0 ||
        nextRow >= GRID_SIZE ||
        nextCol < 0 ||
        nextCol >= GRID_SIZE
      ) {
        soundEffects.playBump();
        setBumpTick((t) => t + 1);
        setIsBumping(true);
        if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
        bumpTimerRef.current = window.setTimeout(() => {
          setIsBumping(false);
        }, BUMP_ANIMATION_MS);

        setFeedback({
          id: Date.now(),
          type: 'blocked',
          message: `Cẩn thận! Bé Lạc không thể đi ${DIRECTION_VI[direction]} ra ngoài bìa rừng.`,
        });
        return;
      }

      // 2. Kiểm tra va vào tảng đá chướng ngại vật
      if (currentGrid[nextRow][nextCol] === 'ROCK') {
        soundEffects.playBump();
        setBumpTick((t) => t + 1);
        setIsBumping(true);
        if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
        bumpTimerRef.current = window.setTimeout(() => {
          setIsBumping(false);
        }, BUMP_ANIMATION_MS);

        setBlockedCell({ row: nextRow, col: nextCol });
        window.setTimeout(() => {
          setBlockedCell((prev) =>
            prev && prev.row === nextRow && prev.col === nextCol ? null : prev
          );
        }, 450);

        setFeedback({
          id: Date.now(),
          type: 'blocked',
          message: 'Ối! Có tảng đá phía trước, Bé Lạc đứng nguyên tại chỗ.',
        });
        return;
      }

      // 3. Khóa trạng thái đang bay trong suốt thời gian animation di chuyển 310ms
      isMovingRef.current = true;
      setIsMoving(true);
      setIsBumping(false);
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
      moveTimerRef.current = window.setTimeout(() => {
        isMovingRef.current = false;
        setIsMoving(false);
      }, MOVE_ANIMATION_MS);

      // Di chuyển mượt mà sang tâm ô mới
      const nextPos: Position = { row: nextRow, col: nextCol };
      playerPosRef.current = nextPos;
      setPlayerPos(nextPos);
      setStepsCount((s) => s + 1);
      setMoveTick((t) => t + 1);
      setLastCommandDir(direction);
      setVisitedKeys((prev) => {
        const key = `${nextRow}-${nextCol}`;
        return prev.includes(key) ? prev : [...prev, key];
      });

      // 4. Kiểm tra Bé Lạc đã về đến tổ (góc dưới phải) chưa
      if (
        nextRow === NEST_POSITION.row &&
        nextCol === NEST_POSITION.col
      ) {
        gameStatusRef.current = 'WON';
        setGameStatus('WON');
        soundEffects.playVictory();
        setFeedback({
          id: Date.now(),
          type: 'win',
          message: '🎉 Bé Lạc đã về tổ!',
        });
        void stopListeningInternal();
        return;
      }

      soundEffects.playMove();
      setFeedback({
        id: Date.now(),
        type: 'move',
        message: `Bé Lạc vừa đi ${DIRECTION_VI[direction]}!`,
      });
    },
    [stopListeningInternal]
  );

  /**
   * Xử lý kết quả dự đoán từ Teachable Machine Audio:
   * - Ngưỡng nhận diện tối thiểu: 55% (0.55).
   * - Background Noise (IDLE) tuyệt đối không điều khiển nhân vật.
   * - Khóa khi đang di chuyển và chống nhận diện lặp khi kéo dài giọng nói.
   */
  const handleRecognitionResult = useCallback(
    async (result: speechCommands.SpeechCommandRecognizerResult) => {
      if (gameStatusRef.current !== 'LISTENING') return;

      const snap = buildRecognitionSnapshot(wordLabelsRef.current, result.scores);
      setSnapshot(snap);

      const now = Date.now();
      let maxDirectionalScore = 0;
      for (const item of snap.probabilities) {
        if (isDirectionalCommand(item.command) && item.score > maxDirectionalScore) {
          maxDirectionalScore = item.score;
        }
      }

      // Nếu đang trong thời gian animation bước đi hoặc đã khóa chống lặp -> không di chuyển thêm
      if (!commandLockedRef.current && !isMovingRef.current) {
        // Chỉ di chuyển khi nhận diện 1 trong 4 khẩu lệnh với confidence >= 55%
        if (
          isDirectionalCommand(snap.command) &&
          snap.confidence >= CONFIDENCE_THRESHOLD
        ) {
          commandLockedRef.current = true;
          setCommandLocked(true);
          setLastRecognizedTick((t) => t + 1);
          lastDirectionalActiveAtRef.current = now;

          soundEffects.playRecognize();
          attemptMove(snap.command);
        }
      } else {
        // Đang khóa: nếu người chơi vẫn kéo dài giọng nói, tiếp tục giữ khóa
        if (maxDirectionalScore >= 0.45) {
          lastDirectionalActiveAtRef.current = now;
        }

        // Chỉ mở khóa sau khi Bé Lạc đã đáp xuống và gặp Background Noise hoặc khoảng lặng
        if (!isMovingRef.current) {
          const isNoiseDetected =
            snap.command === 'IDLE' && snap.confidence >= UNLOCK_NOISE_THRESHOLD;
          const directionalDropped = maxDirectionalScore < 0.35;
          const timedOut =
            now - lastDirectionalActiveAtRef.current >= SILENCE_UNLOCK_MS;

          if (isNoiseDetected || directionalDropped || timedOut) {
            commandLockedRef.current = false;
            setCommandLocked(false);
          }
        }
      }
    },
    [attemptMove]
  );

  /**
   * Bộ đếm dự phòng mở khóa nếu luồng âm thanh im lặng đủ lâu
   */
  useEffect(() => {
    if (gameStatus !== 'LISTENING') return;

    const timer = window.setInterval(() => {
      if (
        commandLockedRef.current &&
        !isMovingRef.current &&
        Date.now() - lastDirectionalActiveAtRef.current >= SILENCE_UNLOCK_MS
      ) {
        commandLockedRef.current = false;
        setCommandLocked(false);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [gameStatus]);

  /**
   * Tải mô hình AI Teachable Machine Audio từ đường dẫn chỉ định (mặc định ./model/)
   * Nếu tải lỗi sẽ báo lỗi cụ thể, tuyệt đối không giả lập AI.
   */
  const loadModelFromPath = useCallback(
    async (targetUrl: string) => {
      setModelError(null);
      setModelStatus('LOADING');

      try {
        await stopListeningInternal();
        const loaded = await loadTeachableMachineModel(targetUrl);
        recognizerRef.current = loaded.recognizer;
        wordLabelsRef.current = loaded.wordLabels;
        setWordLabels(loaded.wordLabels);
        setLoadedModelBaseUrl(loaded.modelBaseUrl);
        setModelStatus('READY');

        try {
          localStorage.setItem(STORAGE_MODEL_URL_KEY, targetUrl.trim());
        } catch {
          // Bỏ qua lỗi lưu localStorage nếu bị hạn chế
        }

        return loaded;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể tải mô hình Teachable Machine. Vui lòng kiểm tra model.json, metadata.json và weights.bin.';
        setModelStatus('ERROR');
        setModelError(msg);
        recognizerRef.current = null;
        setLoadedModelBaseUrl(null);
        return null;
      }
    },
    [stopListeningInternal]
  );

  const handleLoadModel = useCallback(async () => {
    return loadModelFromPath(modelUrl);
  }, [loadModelFromPath, modelUrl]);

  // Tự động nạp sẵn mô hình từ ./model/ khi mở trang (KHÔNG bật microphone cho tới khi nhấn BẮT ĐẦU)
  useEffect(() => {
    void loadModelFromPath(modelUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Kích hoạt microphone và bắt đầu nhận diện giọng nói sau khi người dùng nhấn BẮT ĐẦU
   */
  const handleStartGame = useCallback(async () => {
    if (gameStatusRef.current === 'WON') return;
    setModelError(null);

    let activeRecognizer = recognizerRef.current;

    let normalizedInput: string;
    try {
      normalizedInput = normalizeModelUrl(modelUrl);
    } catch (err) {
      setModelStatus('ERROR');
      setModelError(
        err instanceof Error ? err.message : 'Đường dẫn mô hình không hợp lệ.'
      );
      return;
    }

    if (!activeRecognizer || loadedModelBaseUrl !== normalizedInput) {
      const loaded = await loadModelFromPath(modelUrl);
      if (!loaded) return;
      activeRecognizer = loaded.recognizer;
    }

    try {
      commandLockedRef.current = false;
      setCommandLocked(false);
      lastDirectionalActiveAtRef.current = Date.now();

      await activeRecognizer.listen(handleRecognitionResult, {
        includeSpectrogram: false,
        probabilityThreshold: 0.4,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.5,
        suppressionTimeMillis: 250,
      });

      gameStatusRef.current = 'LISTENING';
      setGameStatus('LISTENING');
      setFeedback({
        id: Date.now(),
        type: 'info',
        message:
          'Micro đã bật! Hãy nói rõ: Lên, Xuống, Sang trái hoặc Sang phải.',
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message.toLowerCase().includes('permission')
          ? 'Trình duyệt chưa được cấp quyền Micro. Vui lòng đồng ý quyền Micro và nhấn BẮT ĐẦU lại.'
          : 'Không thể khởi động Micro. Hãy kiểm tra thiết bị thu âm hoặc cấp quyền Micro trên trình duyệt.';
      setModelError(msg);
      gameStatusRef.current = 'IDLE';
      setGameStatus('IDLE');
    }
  }, [
    handleRecognitionResult,
    loadModelFromPath,
    loadedModelBaseUrl,
    modelUrl,
  ]);

  /**
   * Tạm dừng nghe micro
   */
  const handleStopListening = useCallback(async () => {
    await stopListeningInternal();
    gameStatusRef.current = 'IDLE';
    setGameStatus('IDLE');
    setFeedback({
      id: Date.now(),
      type: 'info',
      message: 'Đã tạm dừng nhận diện giọng nói. Nhấn BẮT ĐẦU để tiếp tục.',
    });
  }, [stopListeningInternal]);

  /**
   * CHƠI LẠI:
   * - Đưa Bé Lạc về vị trí xuất phát (0,0)
   * - Giữ nguyên bản đồ hiện tại (vị trí đá và tổ không đổi)
   * - Đặt lại trạng thái trò chơi
   */
  const handleReplay = useCallback(async () => {
    await stopListeningInternal();
    if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
    if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
    isMovingRef.current = false;

    const start = { ...START_POSITION };
    playerPosRef.current = start;
    gameStatusRef.current = 'IDLE';

    setPlayerPos(start);
    setVisitedKeys([`${start.row}-${start.col}`]);
    setStepsCount(0);
    setMoveTick(0);
    setBumpTick(0);
    setIsMoving(false);
    setIsBumping(false);
    setBlockedCell(null);
    setLastCommandDir(null);
    setSnapshot(null);
    setGameStatus('IDLE');
    setFeedback({
      id: Date.now(),
      type: 'info',
      message: 'Đã đưa Bé Lạc về điểm xuất phát! Nhấn BẮT ĐẦU để chơi lại.',
    });
  }, [stopListeningInternal]);

  /**
   * Tạo bản đồ khu rừng mới ngẫu nhiên (luôn kiểm tra BFS có đường về tổ)
   */
  const handleNewMap = useCallback(async () => {
    await stopListeningInternal();
    if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
    if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
    isMovingRef.current = false;

    const nextGrid = generateRandomSolvableMap(7);
    const start = { ...START_POSITION };

    gridRef.current = nextGrid;
    playerPosRef.current = start;
    gameStatusRef.current = 'IDLE';

    setGrid(nextGrid);
    setPlayerPos(start);
    setVisitedKeys([`${start.row}-${start.col}`]);
    setStepsCount(0);
    setMoveTick(0);
    setBumpTick(0);
    setIsMoving(false);
    setIsBumping(false);
    setBlockedCell(null);
    setLastCommandDir(null);
    setSnapshot(null);
    setGameStatus('IDLE');
    setFeedback({
      id: Date.now(),
      type: 'info',
      message: 'Đã tạo bản đồ khu rừng mới! Nhấn BẮT ĐẦU để dẫn Bé Lạc về tổ.',
    });
  }, [stopListeningInternal]);

  /**
   * Bật/tắt âm thanh hiệu ứng
   */
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEffects.setMuted(next);
      return next;
    });
  }, []);

  /**
   * Hỗ trợ phím mũi tên trên bàn phím để kiểm tra bản đồ thuận tiện (không giả lập AI)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
      };

      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        attemptMove(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attemptMove]);

  /**
   * Dọn dẹp micro và timer khi đóng trang
   */
  useEffect(() => {
    return () => {
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
      const recognizer = recognizerRef.current;
      if (recognizer && recognizer.isListening()) {
        recognizer.stopListening().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-[#e8f6e5] via-[#f2f9f1] to-[#e4f2df] text-[#14281d] overflow-x-hidden">
      {/* Hiệu ứng lá cây rơi chậm từ trên xuống và những chiếc lá nhỏ bay ngang màn hình */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        {backgroundLeaves.map((leaf) => (
          <span
            key={leaf.id}
            className="absolute -top-12 text-lg sm:text-xl opacity-45 animate-leaf-drift"
            style={{
              left: leaf.left,
              animationDuration: leaf.duration,
              animationDelay: leaf.delay,
            }}
          >
            {leaf.symbol}
          </span>
        ))}
        <span
          className="absolute top-[18%] -left-10 text-base sm:text-lg opacity-40 animate-leaf-glide-x"
          style={{ animationDuration: '19s', animationDelay: '1s' }}
        >
          🍃
        </span>
        <span
          className="absolute top-[64%] -left-10 text-base sm:text-lg opacity-35 animate-leaf-glide-x"
          style={{ animationDuration: '24s', animationDelay: '7s' }}
        >
          🌿
        </span>
      </div>

      {/* Thanh tiêu đề trên cùng */}
      <header className="relative z-10 w-full border-b border-[#cbe4c7] bg-white/85 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/image_dbd04a60.png"
              alt="Biểu tượng Bé Lạc"
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain shrink-0"
            />
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-950 truncate">
              DẪN ĐƯỜNG CHO BÉ LẠC VỀ TỔ
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleNewMap}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Đổi bản đồ</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Hướng dẫn</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-600" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-700" />
              )}
              <span className="hidden md:inline">
                {isMuted ? 'Đang tắt tiếng' : 'Âm thanh'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Khu vực chơi chính 2 cột: Bản đồ 6x6 & Bảng điều khiển AI */}
      <main className="relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Cột trái: Bản đồ khu rừng 6x6 */}
          <section className="lg:col-span-7 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
              <div className="flex items-center gap-2 text-sm text-emerald-950 font-semibold">
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>Bản đồ khu rừng 6×6</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 font-medium">
                <span>
                  Vị trí:{' '}
                  <strong className="font-mono-nums text-emerald-900">
                    ({playerPos.row + 1}, {playerPos.col + 1})
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Số bước:{' '}
                  <strong className="font-mono-nums text-orange-600">
                    {stepsCount}
                  </strong>
                </span>
              </div>
            </div>

            <GameBoard
              grid={grid}
              playerPos={playerPos}
              visitedKeys={visitedKeys}
              moveTick={moveTick}
              bumpTick={bumpTick}
              isMoving={isMoving}
              isBumping={isBumping}
              blockedCell={blockedCell}
              lastCommandDir={lastCommandDir}
              feedback={feedback}
              isListening={gameStatus === 'LISTENING'}
              hasWon={gameStatus === 'WON'}
            />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-emerald-900/75">
              <span>🐣 Bé Lạc: Xuất phát (1,1)</span>
              <span aria-hidden="true">·</span>
              <span>🪺 Chiếc tổ: Đích đến (6,6)</span>
              <span aria-hidden="true">·</span>
              <span>🪨 Tảng đá: Không thể đi qua</span>
              <span aria-hidden="true">·</span>
              <span>🌿 Đường cỏ: An toàn</span>
            </div>
          </section>

          {/* Cột phải: Điều khiển AI Teachable Machine & Trạng thái nhận diện */}
          <aside className="lg:col-span-5">
            <AiControlPanel
              modelUrl={modelUrl}
              onModelUrlChange={setModelUrl}
              onLoadModel={handleLoadModel}
              modelStatus={modelStatus}
              modelError={modelError}
              wordLabels={wordLabels}
              gameStatus={gameStatus}
              onStartGame={handleStartGame}
              onStopListening={handleStopListening}
              onReplay={handleReplay}
              commandLocked={commandLocked}
              isMoving={isMoving}
              snapshot={snapshot}
              lastRecognizedTick={lastRecognizedTick}
              onOpenGuide={() => setShowGuide(true)}
            />
          </aside>
        </div>
      </main>

      {/* Màn hình chiến thắng khi Bé Lạc về tổ */}
      {gameStatus === 'WON' && (
        <VictoryOverlay stepsCount={stepsCount} onReplay={handleReplay} />
      )}

      {/* Cửa sổ hướng dẫn */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
