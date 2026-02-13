
export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface GameState {
  snake: Position[];
  food: Position;
  direction: Direction;
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
  gameStarted: boolean;
  speed: number;
}

export interface AITip {
  text: string;
  type: 'strategy' | 'commentary' | 'congrats';
}
