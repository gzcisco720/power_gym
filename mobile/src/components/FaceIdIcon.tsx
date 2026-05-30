import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../lib/theme';

interface FaceIdIconProps {
  size?: number;
  color?: string;
}

export function FaceIdIcon({ size = 24, color = colors.foreground }: FaceIdIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top-left bracket */}
      <Path
        d="M4 8V5a1 1 0 0 1 1-1h3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top-right bracket */}
      <Path
        d="M16 4h3a1 1 0 0 1 1 1v3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-right bracket */}
      <Path
        d="M20 16v3a1 1 0 0 1-1 1h-3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom-left bracket */}
      <Path
        d="M8 20H5a1 1 0 0 1-1-1v-3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left eye */}
      <Rect x="9" y="9" width="1.5" height="2" rx="0.75" fill={color} />
      {/* Right eye */}
      <Rect x="13.5" y="9" width="1.5" height="2" rx="0.75" fill={color} />
      {/* Nose line */}
      <Path
        d="M12 10v2.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Smile arc */}
      <Path
        d="M9.5 14.5c0.7 1 3.3 1 4.5 0"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
