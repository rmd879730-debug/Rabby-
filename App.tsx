
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
  const headImageRef = useRef<HTMLImageElement | null>(null);
  const nextDirection = useRef<Direction>(INITIAL_DIRECTION);

  // Initialize the head image
  useEffect(() => {
    const img = new Image();
    // Using a reliable crop from a known source for Mirza Fakhrul.
    img.src = 'https://i.ibb.co/LhyYv3G/mirza-fakhrul.jpg'; 
    
    img.onload = () => {
      headImageRef.current = img;
    };
  }, []);

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
  }, [score, fetchAiTip, snake.length]);

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
      const isHead = index === 0;
      
      if (isHead && headImageRef.current) {
        ctx.save();
        const centerX = part.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = part.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.translate(centerX, centerY);
        
        // Rotate head based on direction
        let angle = 0;
        if (direction === Direction.RIGHT) angle = Math.PI / 2;
        else if (direction === Direction.DOWN) angle = Math.PI;
        else if (direction === Direction.LEFT) angle = -Math.PI / 2;
        ctx.rotate(angle);

        ctx.shadowBlur = 20;
        ctx.shadowColor = COLORS.SNAKE_HEAD;
        
        // Draw the image centered
        ctx.drawImage(
          headImageRef.current, 
          -GRID_SIZE / 2 - 2, 
          -GRID_SIZE / 2 - 2, 
          GRID_SIZE + 4, 
          GRID_SIZE + 4
        );
        ctx.restore();
      } else {
        ctx.shadowBlur = isHead ? 15 : 0;
        ctx.shadowColor = COLORS.SNAKE_HEAD;
        // Fix: Use COLORS.SNAKE_HEAD instead of non-existent COLORS.SNAKE
        ctx.fillStyle = isHead ? COLORS.SNAKE_HEAD : COLORS.SNAKE_BODY;
        ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
      }
    });

  }, [snake, food, direction]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      <ScoreBoard 
        score={score} 
        highScore={highScore} 
        isMuted={isMuted} 
        onToggleMute={toggleMute} 
      />

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 p-8 max-w-7xl mx-auto w-full">
        <div className="relative group">
          {/* Decorative border */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-rose-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="max-w-full h-auto block"
            />

            {(!gameStarted || isGameOver) && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                {isGameOver ? (
                  <>
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                      <Trophy size={32} />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
                    <p className="text-slate-400 mb-8 max-w-xs">You achieved a score of {score}. Not bad, but you can do better!</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-4">
                      <Play size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">POLITICAL SNAKE</h1>
                    <p className="text-slate-400 mb-8 max-w-xs">Guide the leader through the grid. Eat the red orbs to grow and increase your score.</p>
                  </>
                )}
                
                <button
                  onClick={resetGame}
                  className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all hover:scale-105 flex items-center gap-3 overflow-hidden shadow-lg shadow-emerald-500/20"
                >
                  {isGameOver ? <RotateCcw size={20} /> : <Play size={20} />}
                  <span>{isGameOver ? 'TRY AGAIN' : 'START REVOLUTION'}</span>
                </button>
              </div>
            )}

            {isPaused && !isGameOver && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <div className="bg-slate-900 border border-slate-800 px-8 py-4 rounded-2xl flex items-center gap-4 shadow-2xl animate-in zoom-in duration-200">
                  <Pause className="text-emerald-400 animate-pulse" />
                  <span className="text-2xl font-bold tracking-widest text-white">PAUSED</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8 w-full max-w-xs">
          <AICoach tip={aiTip} isLoading={isAiLoading} />
          
          <div className="p-6 bg-slate-900/50 border border-slate-800/50 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Keyboard size={18} />
              <h4 className="text-xs font-bold uppercase tracking-widest">Controls</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
              <div className="bg-slate-800 p-2 rounded-lg flex justify-between items-center">
                <span className="text-slate-500 uppercase">Move</span>
                <span className="text-emerald-400">Arrows</span>
              </div>
              <div className="bg-slate-800 p-2 rounded-lg flex justify-between items-center">
                <span className="text-slate-500 uppercase">Pause</span>
                <span className="text-emerald-400">Space</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-slate-600">
            <a href="#" className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
              <Github size={14} /> Repository
            </a>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">V1.2.0-PRO</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
