import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../theme";
import { display, body } from "../fonts";
import { Reveal } from "../components/Reveal";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(frame, [0, 150], [1.06, 1]);
  const glow = 0.3 + Math.sin(frame / 20) * 0.08;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 90% at 50% 55%, ${COLORS.ink2} 0%, ${COLORS.ink} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: 9999,
          background: `radial-gradient(circle, rgba(217,98,43,${glow}) 0%, rgba(217,98,43,0) 62%)`,
          filter: "blur(20px)",
        }}
      />
      <Reveal delay={2} duration={30} distance={50} blur={18}>
        <div
          style={{
            fontFamily: display,
            fontSize: 220,
            letterSpacing: 22,
            color: COLORS.bone,
            lineHeight: 1,
          }}
        >
          CRONOS
        </div>
      </Reveal>
      <div
        style={{
          height: 4,
          width: 420 * s,
          background: COLORS.ember,
          marginTop: 24,
          marginBottom: 28,
        }}
      />
      <Reveal delay={26} duration={24} distance={26}>
        <div
          style={{
            fontFamily: body,
            fontSize: 30,
            letterSpacing: 9,
            color: COLORS.slate,
          }}
        >
          DOCUMENTALES DE HISTORIA
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};
