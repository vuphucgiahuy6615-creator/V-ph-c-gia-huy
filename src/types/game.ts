// Định nghĩa các kiểu dữ liệu chính cho trò chơi "Dẫn đường cho Bé Lạc về tổ"

export type CellType = 'PATH' | 'ROCK' | 'START' | 'NEST';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type VoiceClassCommand = Direction | 'IDLE' | 'UNKNOWN';

export interface Position {
  row: number;
  col: number;
}

export type GameStatus = 'IDLE' | 'LISTENING' | 'WON';

export type ModelStatus = 'UNLOADED' | 'LOADING' | 'READY' | 'ERROR';

export interface ClassProbability {
  label: string;
  command: VoiceClassCommand;
  score: number;
}

export interface RecognitionSnapshot {
  rawLabel: string;
  displayLabel: string;
  command: VoiceClassCommand;
  confidence: number;
  probabilities: ClassProbability[];
  timestamp: number;
}

export interface FeedbackBanner {
  id: number;
  type: 'move' | 'blocked' | 'noise' | 'info' | 'win';
  message: string;
}
