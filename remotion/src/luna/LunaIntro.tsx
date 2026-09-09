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

export const LunaIntro: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  const t2 = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  const line = interpolate(frame, [26, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <PhotoLayer
        src="images/luna/001.jpg"
        duration={duration}
        opacity={0.5}
        panX={-14}
        panY={8}
        zoomFrom={1.22}
        zoomTo={1.04}
      />
      <AbsoluteFill style={{ padding: "0 0 0 130px", justifyContent: "center" }}>
        <span
          style={{
            fontFamily: display,
            fontSize: 34,
            letterSpacing: 12,
            color: COLORS.brass,
            opacity: t,
          }}
        >
          CRONOS ESTUDIO
        </span>
        <h1
          style={{
            fontFamily: display,
            fontSize: 208,
            lineHeight: 0.9,
            margin: "14px 0 0",
            color: COLORS.bone,
            letterSpacing: 2,
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [40, 0])}px)`,
          }}
        >
          EL ALUNIZAJE
        </h1>
        <div
          style={{
            width: 620 * line,
            height: 4,
            background: COLORS.ember,
            margin: "26px 0 22px",
          }}
        />
        <span
          style={{
            fontFamily: body,
            fontSize: 40,
            color: COLORS.bone,
            opacity: line,
            letterSpacing: 2,
          }}
        >
          Apolo 11 · Volumen 1 — La promesa y el precio
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
