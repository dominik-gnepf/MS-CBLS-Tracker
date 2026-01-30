import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TimerProps {
  defaultMinutes?: number;
}

const Timer: React.FC<TimerProps> = ({ defaultMinutes = 6 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60); // in seconds
  const [initialTime, setInitialTime] = useState(defaultMinutes * 60);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;

  // Play alarm sound using Web Audio API
  const playAlarm = useCallback(() => {
    setIsAlarmPlaying(true);
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      // Play a sequence of beeps
      const playBeep = (startTime: number, frequency: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play alarm pattern: 3 sets of 3 beeps
      const now = ctx.currentTime;
      for (let set = 0; set < 3; set++) {
        for (let beep = 0; beep < 3; beep++) {
          const startTime = now + set * 1.5 + beep * 0.2;
          playBeep(startTime, 880, 0.15); // A5 note
        }
      }

      // Stop alarm after 5 seconds
      setTimeout(() => {
        stopAlarm();
      }, 5000);
    } catch (error) {
      console.error('Error playing alarm:', error);
      setIsAlarmPlaying(false);
    }
  }, []);

  const stopAlarm = () => {
    setIsAlarmPlaying(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, playAlarm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(initialTime);
    }
    setIsRunning(true);
    setIsOpen(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialTime);
    stopAlarm();
  };

  const setPresetTime = (minutes: number) => {
    const seconds = minutes * 60;
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
  };

  // Determine button color based on state
  const getButtonColor = () => {
    if (isAlarmPlaying) return 'bg-red-500 hover:bg-red-600 animate-pulse';
    if (isRunning) return 'bg-green-500 hover:bg-green-600';
    if (timeLeft === 0) return 'bg-orange-500 hover:bg-orange-600';
    if (timeLeft < initialTime) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Timer Button */}
      <button
        onClick={() => {
          if (isAlarmPlaying) {
            stopAlarm();
            resetTimer();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white transition-colors ${getButtonColor()}`}
        title={isAlarmPlaying ? 'Stop Alarm' : 'Timer'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-mono text-sm font-medium">{formatTime(timeLeft)}</span>
        {isRunning && (
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Timer</h3>
            
            {/* Progress Ring */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    stroke={isRunning ? '#22c55e' : timeLeft === 0 ? '#ef4444' : '#3b82f6'}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-mono font-bold text-gray-700">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-2 mb-4">
              {!isRunning ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Start
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
              )}
              <button
                onClick={resetTimer}
                className="flex items-center gap-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>

            {/* Preset Times */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500 mb-2">Quick presets:</p>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5, 6, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setPresetTime(mins)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      initialTime === mins * 60
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;
