
import { Direction, Position } from './types';

export const GRID_SIZE = 20;
export const CANVAS_SIZE = 600;
export const INITIAL_SPEED = 140;
export const SPEED_INCREMENT = 2;
export const MIN_SPEED = 60;

export const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

export const INITIAL_DIRECTION = Direction.UP;

export const COLORS = {
  SNAKE_HEAD: '#10b981', // Emerald 500
  SNAKE_BODY: '#059669', // Emerald 600
  FOOD: '#f43f5e',       // Rose 500
  GRID: '#1e293b',       // Slate 800
  BG: '#020617',         // Slate 950
};
