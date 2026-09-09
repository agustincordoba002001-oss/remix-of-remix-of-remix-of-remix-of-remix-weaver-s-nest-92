import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, random } from "remotion";
import { COLORS } from "../theme";

/** Film grain + vignette + subtle gate flicker. Persistent top layer. */
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.055 + random(`f${Math.floor(frame / 2)}`) * 0.045;
  const drift = interpolate(frame % 60, [0, 60], [0, 1]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: flicker,
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>`
              .replace("%23n", "#n")
          )}")`,
          backgroundSize: "480px 480px",
          backgroundPosition: `${drift * 40}px ${drift * -25}px`,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill
        style={{
          border: `1px solid rgba(242,236,225,0.08)`,
          margin: 44,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 44,
          bottom: 44,
          width: 120,
          height: 4,
          background: COLORS.ember,
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};
