// Icône Netflix "reculer 10s" — flèche circulaire vers la gauche avec "10"
import React from "react";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface SkipIconProps {
  size?: number;
  color?: string;
}

export function SkipBackIcon({ size = 36, color = "#fff" }: SkipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Flèche circulaire anti-horaire */}
      <Path
        d="M12.5 4V1L7.5 5l5 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4.5c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
        fill={color}
      />
      {/* "10" centré */}
      <SvgText
        x="12.5"
        y="13.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="bold"
        fill={color}
      >
        10
      </SvgText>
    </Svg>
  );
}

export function SkipForwardIcon({ size = 36, color = "#fff" }: SkipIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Flèche circulaire horaire */}
      <Path
        d="M11.5 4V1l5 4-5 4V6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"
        fill={color}
      />
      {/* "10" centré */}
      <SvgText
        x="11.5"
        y="13.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="bold"
        fill={color}
      >
        10
      </SvgText>
    </Svg>
  );
}
