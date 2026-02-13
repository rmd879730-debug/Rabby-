
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GRID_SIZE, 
  CANVAS_SIZE, 
  INITIAL_SNAKE, 
  INITIAL_DIRECTION, 
  COLORS, 
  INITIAL_SPEED, 
  SPEED_INCREMENT, 
  MIN_SPEED 
} from './constants';
import { Direction, Position, AITip } from './types';
import { ScoreBoard } from './components/ScoreBoard';
import { AICoach } from './components/AICoach';
import { getAIGameTip } from './services/geminiService';
import { audio } from './services/audioService';
import { Play, RotateCcw, Pause, Github, Trophy, Keyboard } from 'lucide-react';

const App: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(Number(localStorage.getItem('snake-high-score')) || 0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [aiTip, setAiTip] = useState<AITip | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextDirection = useRef<Direction>(INITIAL_DIRECTION);

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
      };
      if (!currentSnake.some(part => part.x === newFood.x && part.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    nextDirection.current = INITIAL_DIRECTION;
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    setSpeed(INITIAL_SPEED);
    setFood(generateFood(INITIAL_SNAKE));
    setAiTip(null);
    
    // Audio triggers
    audio.playStart();
    audio.startMusic();
    audio.setPaused(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    switch (e.key) {
      case 'ArrowUp':
        if (direction !== Direction.DOWN) nextDirection.current = Direction.UP;
        break;
      case 'ArrowDown':
        if (direction !== Direction.UP) nextDirection.current = Direction.DOWN;
        break;
      case 'ArrowLeft':
        if (direction !== Direction.RIGHT) nextDirection.current = Direction.LEFT;
        break;
      case 'ArrowRight':
        if (direction !== Direction.LEFT) nextDirection.current = Direction.RIGHT;
        break;
      case ' ':
        if (gameStarted && !isGameOver) {
          const newPaused = !isPaused;
          setIsPaused(newPaused);
          audio.setPaused(newPaused);
        }
        else if (!gameStarted || isGameOver) resetGame();
        break;
    }
  }, [direction, gameStarted, isGameOver, isPaused]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audio.setMuted(newMuted);
  };

  const fetchAiTip = useCallback(async (currentScore: number, currentLen: number) => {
    setIsAiLoading(true);
    const tip = await getAIGameTip(currentScore, highScore, currentLen);
    setAiTip(tip);
    setIsAiLoading(false);
  }, [highScore]);

  useEffect(() => {
    if (score > 0 && score % 5 === 0) {
      fetchAiTip(score, snake.length);
    }
  }, [score, fetchAiTip]);

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused || !gameStarted) return;

    setSnake(prevSnake => {
      setDirection(nextDirection.current);
      const head = { ...prevSnake[0] };

      switch (nextDirection.current) {
        case Direction.UP: head.y -= 1; break;
        case Direction.DOWN: head.y += 1; break;
        case Direction.LEFT: head.x -= 1; break;
        case Direction.RIGHT: head.x += 1; break;
      }

      const gridSizeCount = CANVAS_SIZE / GRID_SIZE;
      if (
        head.x < 0 || head.x >= gridSizeCount ||
        head.y < 0 || head.y >= gridSizeCount ||
        prevSnake.some(part => part.x === head.x && part.y === head.y)
      ) {
        setIsGameOver(true);
        audio.playCrash();
        audio.stopMusic();
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('snake-high-score', score.toString());
        }
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        audio.playEat();
        setScore(s => s + 1);
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [isGameOver, isPaused, gameStarted, food, generateFood, score, highScore]);

  useEffect(() => {
    const timer = setInterval(moveSnake, speed);
    return () => clearInterval(timer);
  }, [moveSnake, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_SIZE; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.FOOD;
    ctx.fillStyle = COLORS.FOOD;
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((part, index) => {
      ctx.shadowBlur = index === 0 ? 15 : 0;
      ctx.shadowColor = COLORS.SNAKE_HEAD;
      ctx.fillStyle = index === 0 ? COLORS.SNAKE_HEAD : COLORS.SNAKE_BODY;
      const padding = 1;
      ctx.fillRect(part.x * GRID_SIZE + padding, part.y * GRID_SIZE + padding, GRID_SIZE - padding * 2, GRID_SIZE - padding * 2);
    });
    ctx.shadowBlur = 0;
  }, [snake, food]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-50">
      <ScoreBoard score={score} highScore={highScore} isMuted={isMuted} onToggleMute={toggleMute} />

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 p-4 md:p-8 overflow-hidden">
        <div className="hidden lg:flex flex-col gap-6 w-full max-w-xs h-full justify-center">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tighter">
              <Keyboard className="text-emerald-400" size={18} /> Terminal
            </h2>
            <ul className="text-xs text-slate-400 space-y-3 font-mono">
              <li className="flex justify-between border-b border-slate-800/50 pb-1"><span>MOVE</span> <span className="text-emerald-400">ARROWS</span></li>
              <li className="flex justify-between border-b border-slate-800/50 pb-1"><span>PAUSE</span> <span className="text-emerald-400">SPACE</span></li>
              <li className="flex justify-between"><span>VOLUME</span> <span className="text-emerald-400">CLICK_ICON</span></li>
            </ul>
          </div>
          <AICoach tip={aiTip} isLoading={isAiLoading} />
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-rose-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="relative bg-slate-950 border-2 border-slate-800 rounded-lg shadow-2xl block max-w-full h-auto"
          />

          {!gameStarted && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10 p-8 text-center">
              <h1 className="text-6xl font-black mb-4 bg-gradient-to-br from-emerald-400 to-emerald-600 bg-clip-text text-transparent italic tracking-tighter">NEON SNAKE</h1>
              <p className="text-slate-400 mb-8 max-w-xs text-sm">Neural link established. Ready for simulation?</p>
              <button 
                onClick={resetGame}
                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 uppercase tracking-widest"
              >
                <Play fill="currentColor" size={20} /> Initialize
              </button>
            </div>
          )}

          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-lg z-10 p-4 animate-in fade-in zoom-in duration-300">
              <div className="mb-4 text-rose-500">
                <Trophy size={64} className="animate-bounce" />
              </div>
              <h2 className="text-4xl font-bold mb-2 tracking-tighter">SYSTEM OVERLOAD</h2>
              <p className="text-slate-400 mb-8 font-mono text-sm">SEQUENCE_END // SCORE: {score}</p>
              <button 
                onClick={resetGame}
                className="flex items-center gap-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-rose-500/20 uppercase tracking-widest"
              >
                <RotateCcw size={20} /> Retry Boot
              </button>
            </div>
          )}

          {isPaused && !isGameOver && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
              <div className="bg-slate-900 border border-slate-800 px-8 py-4 rounded-2xl flex flex-col items-center shadow-2xl scale-110">
                <Pause size={48} className="text-emerald-400 mb-2" />
                <h3 className="text-xl font-bold uppercase tracking-widest text-emerald-400">Simulation Paused</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">SPACE TO RESUME</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex lg:hidden flex-col gap-4 w-full">
           <AICoach tip={aiTip} isLoading={isAiLoading} />
           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setIsPaused(!isPaused); audio.setPaused(!isPaused); }} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-center text-emerald-400">
                {isPaused ? <Play size={24} /> : <Pause size={24} />}
              </button>
              <button onClick={resetGame} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-center text-rose-400">
                <RotateCcw size={24} />
              </button>
           </div>
        </div>
      </main>

      <footer className="w-full py-3 px-8 border-t border-slate-900/50 flex justify-between items-center text-[10px] text-slate-600 font-mono tracking-tighter bg-slate-950">
        <div className="flex gap-4">
          <span>S_RATE: 44.1KHZ</span>
          <span>AUDIO_SYNC: OK</span>
          <span>SNAKE_V3_STABLE</span>
        </div>
        <div className="flex items-center gap-2">
           <Github size={12} />
           <span>SOURCE://NEON-SNAKE.IO</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
