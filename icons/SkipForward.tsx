import * as React from "react";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface SkipForwardProps {
  size?: number;
  color?: string;
  seconds?: number;
}

// Icône Netflix-style : flèche circulaire horaire avec nombre de secondes
export function SkipForward({
  size = 42,
  color = "#fff",
  seconds = 10,
}: SkipForwardProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Flèche circulaire horaire (forward) */}
      <Path
        d="M24 8c-9.94 0-18 8.06-18 18h4c0-7.73 6.27-14 14-14v6l8-8-8-8v6zm14 18c0 7.73-6.27 14-14 14S10 33.73 10 26H6c0 9.94 8.06 18 18 18s18-8.06 18-18h-4z"
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
