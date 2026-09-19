import React from 'react';

interface HexagonLogoProps {
  className?: string;
  size?: number;
}

export const HexagonLogo: React.FC<HexagonLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* 3D Isometric Hexagonal Cube Logo */}
      <defs>
        <filter id="cube-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#d97706" floodOpacity="0.3" />
        </filter>
      </defs>
      
      <g filter="url(#cube-shadow)">
        {/* Top Face - Light Orange/Yellow */}
        <path
          d="M50 12 L82 30 L50 48 L18 30 Z"
          fill="#fbbf24"
        />
        {/* Top Face Inner Cutout / Grid Groove Motif */}
        <path
          d="M50 24 L66 33 L50 42 L34 33 Z"
          fill="#f59e0b"
        />

        {/* Left Face - Medium Orange/Amber */}
        <path
          d="M18 30 L50 48 L50 86 L18 68 Z"
          fill="#f97316"
        />
        {/* Left Face Inner Detail */}
        <path
          d="M26 40 L42 49 L42 74 L26 65 Z"
          fill="#ea580c"
        />

        {/* Right Face - Dark Warm Amber */}
        <path
          d="M50 48 L82 30 L82 68 L50 86 Z"
          fill="#d97706"
        />
        {/* Right Face Inner Detail */}
        <path
          d="M58 49 L74 40 L74 65 L58 74 Z"
          fill="#b45309"
        />

        {/* Hexagon Outline highlights */}
        <path
          d="M50 12 L82 30 L82 68 L50 86 L18 68 L18 30 Z"
          stroke="#fef3c7"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
