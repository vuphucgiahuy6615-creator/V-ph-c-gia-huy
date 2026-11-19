// Kết nối thực tế với mô hình Teachable Machine Audio thông qua TensorFlow.js & @tensorflow-models/speech-commands
import '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import {
  ClassProbability,
  Direction,
  RecognitionSnapshot,
  VoiceClassCommand,
} from '../types/game';

// Đường dẫn mô hình Teachable Machine Audio mặc định trong thư mục ./model/
export const DEFAULT_LOCAL_MODEL_URL = './model/';

// Ngưỡng tin cậy tối thiểu 55% (0.55) để cho phép Bé Lạc di chuyển
export const CONFIDENCE_THRESHOLD = 0.55;

/**
 * Chuẩn hóa chuỗi tiếng Việt: bỏ dấu, viết thường, xóa khoảng trắng thừa
 * để ánh xạ chính xác các lớp âm thanh mà không thay đổi tên lớp gốc trong metadata.json.
 */
function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ')
    .trim();
}

/**
 * Ánh xạ tên lớp âm thanh từ metadata.json sang khẩu lệnh điều khiển:
 * - "Lên" -> UP
 * - "Xuống" -> DOWN
 * - "Sang trái" -> LEFT
 * - "Sang phải" -> RIGHT
 * - "Background Noise" -> NOISE (trạng thái IDLE, tuyệt đối không điều khiển nhân vật)
 */
export function mapLabelToCommand(rawLabel: string): VoiceClassCommand {
  const exact = rawLabel.trim();
  if (exact === 'Lên') return 'UP';
  if (exact === 'Xuống') return 'DOWN';
  if (exact === 'Sang trái') return 'LEFT';
  if (exact === 'Sang phải') return 'RIGHT';
  if (exact === 'Background Noise') return 'IDLE';

  const norm = normalizeText(rawLabel);

  if (
    norm === 'background noise' ||
    norm.includes('noise') ||
    norm.includes('background') ||
    norm.includes('tieng on') ||
    norm.includes('tieng nen') ||
    norm.includes('im lang') ||
    norm === 'nen' ||
    norm === 'unknown'
  ) {
    return 'IDLE';
  }

  if (norm === 'len' || norm === 'up' || norm.includes('di len')) {
    return 'UP';
  }

  if (norm === 'xuong' || norm === 'down' || norm.includes('di xuong')) {
    return 'DOWN';
  }

  if (
    norm === 'sang trai' ||
    norm === 'trai' ||
    norm === 'left' ||
    norm.includes('re trai')
  ) {
    return 'LEFT';
  }

  if (
    norm === 'sang phai' ||
    norm === 'phai' ||
    norm === 'right' ||
    norm.includes('re phai')
  ) {
    return 'RIGHT';
  }

  return 'UNKNOWN';
}

/**
 * Hiển thị tên lớp âm thanh kèm hướng di chuyển rõ ràng trên giao diện
 */
export function getCommandDisplayLabel(
  command: VoiceClassCommand,
  rawLabel?: string
): string {
  if (rawLabel && rawLabel.trim()) {
    if (command === 'IDLE') {
      return `${rawLabel} (Đứng yên)`;
    }
    return rawLabel;
  }

  switch (command) {
    case 'UP':
      return 'Lên';
    case 'DOWN':
      return 'Xuống';
    case 'LEFT':
      return 'Sang trái';
    case 'RIGHT':
      return 'Sang phải';
    case 'IDLE':
      return 'Background Noise (Đứng yên)';
    default:
      return 'Không xác định';
  }
}

export function isDirectionalCommand(
  cmd: VoiceClassCommand
): cmd is Direction {
  return cmd === 'UP' || cmd === 'DOWN' || cmd === 'LEFT' || cmd === 'RIGHT';
}

/**
 * Chuẩn hóa đường dẫn mô hình: hỗ trợ cả đường dẫn cục bộ (./model/)
 * và URL trực tuyến từ Teachable Machine (https://teachablemachine.withgoogle.com/models/.../)
 */
export function normalizeModelUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Vui lòng nhập đường dẫn mô hình hoặc dùng ./model/.');
  }

  // Hỗ trợ đường dẫn tương đối / cục bộ như ./model/ hoặc /model/
  if (
    trimmed.startsWith('./') ||
    trimmed.startsWith('/') ||
    !trimmed.includes('://')
  ) {
    if (trimmed.includes('://')) {
      throw new Error('Đường dẫn mô hình không hợp lệ.');
    }
    const baseOrigin =
      typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : 'http://localhost:3000/';
    const resolved = new URL(trimmed.replace(/^\/+/, ''), baseOrigin);
    const cleanPath = resolved
      .toString()
      .replace(/\/+(model\.json|metadata\.json)?$/, '');
    return `${cleanPath}/`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      'Đường dẫn URL không hợp lệ. Ví dụ: ./model/ hoặc https://teachablemachine.withgoogle.com/models/h_tAjSKNG/'
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('URL mô hình phải bắt đầu bằng https://, http:// hoặc ./model/.');
  }

  const cleanPath = parsed
    .toString()
    .replace(/\/+(model\.json|metadata\.json)?$/, '');
  return `${cleanPath}/`;
}

export interface LoadedTeachableMachine {
  recognizer: speechCommands.SpeechCommandRecognizer;
  wordLabels: string[];
  modelBaseUrl: string;
}

/**
 * Kiểm tra cụ thể khả năng tải đủ cả 3 file: model.json, metadata.json và file weights (.bin)
 * trước khi khởi tạo speechCommands recognizer.
 */
async function verifyModelFiles(modelBaseUrl: string): Promise<void> {
  const checkpointURL = `${modelBaseUrl}model.json`;
  const metadataURL = `${modelBaseUrl}metadata.json`;

  // 1. Kiểm tra model.json
  let modelJson: {
    weightsManifest?: Array<{ paths?: string[] }>;
  };
  try {
    const res = await fetch(checkpointURL, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    modelJson = (await res.json()) as {
      weightsManifest?: Array<{ paths?: string[] }>;
    };
  } catch (err) {
    throw new Error(
      `Không tải được file model.json tại "${checkpointURL}" (${
        err instanceof Error ? err.message : 'Lỗi kết nối'
      }).`
    );
  }

  // 2. Kiểm tra metadata.json
  try {
    const res = await fetch(metadataURL, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const meta = (await res.json()) as { wordLabels?: unknown };
    if (!Array.isArray(meta.wordLabels) || meta.wordLabels.length === 0) {
      throw new Error('Thiếu danh sách wordLabels trong metadata.json');
    }
  } catch (err) {
    throw new Error(
      `Không tải được file metadata.json tại "${metadataURL}" (${
        err instanceof Error ? err.message : 'Lỗi kết nối'
      }).`
    );
  }

  // 3. Kiểm tra các file weights (.bin) được khai báo trong weightsManifest
  const weightPaths =
    modelJson.weightsManifest?.flatMap((group) => group.paths || []) ?? [];

  if (weightPaths.length === 0) {
    throw new Error('File model.json không khai báo đường dẫn weights.bin.');
  }

  for (const relPath of weightPaths) {
    const weightURL = new URL(relPath, modelBaseUrl).toString();
    try {
      const res = await fetch(weightURL, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) {
        // Thử GET nếu máy chủ không hỗ trợ HEAD
        const getRes = await fetch(weightURL, { cache: 'no-store' });
        if (!getRes.ok) {
          throw new Error(`HTTP ${getRes.status}`);
        }
      }
    } catch (err) {
      throw new Error(
        `Không tải được file trọng số "${relPath}" tại "${weightURL}" (${
          err instanceof Error ? err.message : 'Lỗi kết nối'
        }).`
      );
    }
  }
}

/**
 * Tải mô hình Teachable Machine Audio thực sự từ ./model/ hoặc URL người dùng cung cấp
 */
export async function loadTeachableMachineModel(
  rawUrl: string
): Promise<LoadedTeachableMachine> {
  const modelBaseUrl = normalizeModelUrl(rawUrl);
  const checkpointURL = `${modelBaseUrl}model.json`;
  const metadataURL = `${modelBaseUrl}metadata.json`;

  // Xác minh đủ cả 3 file (model.json, metadata.json, weights.bin) trước khi nạp vào TFJS
  await verifyModelFiles(modelBaseUrl);

  const recognizer = speechCommands.create(
    'BROWSER_FFT',
    undefined,
    checkpointURL,
    metadataURL
  );

  await recognizer.ensureModelLoaded();
  const wordLabels = recognizer.wordLabels();

  if (!wordLabels || wordLabels.length === 0) {
    throw new Error('Mô hình không có nhãn lớp âm thanh hợp lệ trong metadata.json.');
  }

  return {
    recognizer,
    wordLabels,
    modelBaseUrl,
  };
}

/**
 * Chuyển đổi mảng xác suất từ recognizer.listen() thành RecognitionSnapshot giữ nguyên tên lớp gốc
 */
export function buildRecognitionSnapshot(
  wordLabels: string[],
  scores: Float32Array | Float32Array[]
): RecognitionSnapshot {
  const flatScores = Array.isArray(scores)
    ? Array.from(scores[0] || [])
    : Array.from(scores);

  const probabilities: ClassProbability[] = wordLabels.map((label, idx) => ({
    label,
    command: mapLabelToCommand(label),
    score: flatScores[idx] ?? 0,
  }));

  // Tìm lớp có độ tin cậy cao nhất
  let top = probabilities[0] ?? {
    label: 'Background Noise',
    command: 'NOISE' as VoiceClassCommand,
    score: 0,
  };

  for (const item of probabilities) {
    if (item.score > top.score) {
      top = item;
    }
  }

  return {
    rawLabel: top.label,
    displayLabel: getCommandDisplayLabel(top.command, top.label),
    command: top.command,
    confidence: top.score,
    probabilities,
    timestamp: Date.now(),
  };
}
