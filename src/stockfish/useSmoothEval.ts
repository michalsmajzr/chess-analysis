"use client";
import { useState, useEffect } from "react";

export function useSmoothEval(targetValue: number, speed = 0.12) {
  const [smoothValue, setSmoothValue] = useState(targetValue);

  useEffect(() => {
    let frame: number;

    const animate = () => {
      setSmoothValue((prev) => {
        const diff = targetValue - prev;
        if (Math.abs(diff) < 0.01) {
          return targetValue;
        }
        return prev + diff * speed;
      });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetValue, speed]);

  return smoothValue;
}
