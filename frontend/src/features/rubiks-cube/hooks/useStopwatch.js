import { useState, useRef, useCallback } from 'react';

export function useStopwatch() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const startStopwatch = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - (time * 1000); // 停止からの再開に対応
      timerRef.current = setInterval(() => {
        setTime((Date.now() - startTimeRef.current) / 1000);
      }, 100); // 100msごとに更新
      setIsRunning(true);
    }
  }, [isRunning, time]);

  const stopStopwatch = useCallback(() => {
    clearInterval(timerRef.current);
    setIsRunning(false);
  }, []);

  const resetStopwatch = useCallback(() => {
    clearInterval(timerRef.current);
    setTime(0);
    setIsRunning(false);
  }, []);

  return { time, isRunning, startStopwatch, stopStopwatch, resetStopwatch };
}