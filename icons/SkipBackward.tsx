import * as React from "react";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface SkipBackwardProps {
  size?: number;
  color?: string;
  seconds?: number;
}

// Icône Netflix-style : flèche circulaire anti-horaire avec nombre de secondes
export function SkipBackward({
  size = 42,
  color = "#fff",
  seconds = 10,
}: SkipBackwardProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Flèche circulaire anti-horaire (rewind) */}
      <Path
        d="M24 8V2L16 10l8 8v-6c7.73 0 14 6.27 14 14s-6.27 14-14 14S10 33.73 10 26H6c0 9.94 8.06 18 18 18s18-8.06 18-18S33.94 8 24 8z"
        fill={color}
      />
      {/* Nombre de secondes au centre */}
      <SvgText
        x="24"
        y="30"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill={color}
      >
        {seconds}
      </SvgText>
    </Svg>
  );
}
