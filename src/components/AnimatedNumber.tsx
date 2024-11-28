'use client';

import { useEffect, useState } from 'react';
import { useMotionValue, animate } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  duration = 1.5,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    // Always immediately set the value
    setDisplayValue(value);

    // Check if this is actually a fresh page load
    const pageLoadTime = window.performance.timing.navigationStart;
    const now = Date.now();
    const isInitialLoad = now - pageLoadTime < 1000; // Within 1 second of page load

    if (isInitialLoad) {
      const controls = animate(motionValue, value, {
        duration,
        onUpdate: (latest) => {
          setDisplayValue(Math.round(latest));
        },
      });
      return () => controls.stop();
    }
  }, [value, duration, motionValue]);

  return <span>{displayValue}</span>;
}
