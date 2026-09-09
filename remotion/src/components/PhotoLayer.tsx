import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COLORS } from "../theme";

type Props = {
  src: string;
  /** Ken Burns direction */
  zoomFrom?: number;
  zoomTo?: number;
  panX?: number;
  panY?: number;
  opacity?: number;
  duration?: number;
};

export const PhotoLayer: React.FC<Props> = ({
  src,
  zoomFrom = 1.06,
  zoomTo = 1.2,
  panX = 0,
  panY = 0,
  opacity = 0.5,
  duration = 330,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, duration], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, duration], [0, panX], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, duration], [0, panY], {
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, 22], [0, opacity], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
          opacity: fadeIn,
          filter: "saturate(0.7) contrast(1.08)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(100deg, ${COLORS.ink} 6%, rgba(12,15,19,0.82) 46%, rgba(12,15,19,0.25) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
