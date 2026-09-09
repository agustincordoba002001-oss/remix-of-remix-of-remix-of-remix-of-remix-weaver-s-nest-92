import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { COLORS } from "../theme";
import { body, display } from "../fonts";

export const LunaOutro: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const t2 = spring({ frame: frame - 34, fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [duration - 26, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, opacity: fadeOut }}>
      <PhotoLayer
        src="images/luna/012.jpg"
        duration={duration}
        opacity={0.4}
        panX={0}
        panY={-12}
        zoomFrom={1.06}
        zoomTo={1.2}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <span
          style={{
            fontFamily: body,
            fontSize: 42,
            color: COLORS.bone,
            opacity: t,
            letterSpacing: 3,
            textAlign: "center",
            maxWidth: 1200,
          }}
        >
          Faltaban dos meses para el 20 de julio de 1969.
        </span>
        <h2
          style={{
            fontFamily: display,
            fontSize: 132,
            color: COLORS.ember,
            margin: "26px 0 0",
            letterSpacing: 6,
            opacity: t2,
            transform: `scale(${interpolate(t2, [0, 1], [0.92, 1])})`,
          }}
        >
          CONTINÚA EN EL VOLUMEN 2
        </h2>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
