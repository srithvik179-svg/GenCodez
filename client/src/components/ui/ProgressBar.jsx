import React, { useEffect, useState } from 'react';

/**
 * Animated Progress Bar
 * 
 * @param {number} percentage - The fill percentage (0-100)
 * @param {boolean} isWinner - If true, applies success color and animated stripes
 */
export default function ProgressBar({ percentage, isWinner = false }) {
  const [width, setWidth] = useState(0);

  // Animate from 0 to target percentage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 150); // slight delay for smooth entry
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="progress-bar-container">
      <div 
        className={`progress-bar-fill ${isWinner ? 'progress-bar-fill--winner' : ''}`}
        style={{ width: `${width}%` }}
      ></div>
    </div>
  );
}
