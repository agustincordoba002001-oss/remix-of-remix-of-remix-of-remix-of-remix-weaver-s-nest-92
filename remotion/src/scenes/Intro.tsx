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

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bar = spring({ frame, fps, config: { damping: 200 } });
  const push = interpolate(frame, [0, 105], [1.12, 1], {
    extrapolateRight: "clamp",
  });
  const sweep = interpolate(frame, [10, 90], [-30, 110], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(90% 120% at 18% 12%, ${COLORS.ink2} 0%, ${COLORS.ink} 65%)`,
        transform: `scale(${push})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${sweep}%`,
          width: 340,
          background: `linear-gradient(90deg, rgba(217,98,43,0) 0%, rgba(217,98,43,0.16) 50%, rgba(217,98,43,0) 100%)`,
          transform: "skewX(-12deg)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: 160,
          paddingRight: 400,
        }}
      >
        <Reveal delay={4} from="left" distance={90}>
          <div
            style={{
              fontFamily: body,
              color: COLORS.brass,
              letterSpacing: 10,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            CRONOS
          </div>
        </Reveal>

        <div
          style={{
            height: 5,
            width: 260 * bar,
            background: COLORS.ember,
            marginTop: 22,
            marginBottom: 30,
          }}
        />

        <Reveal delay={14} duration={34} distance={90} blur={18}>
          <div
            style={{
              fontFamily: display,
              color: COLORS.bone,
              fontSize: 168,
              lineHeight: 0.86,
              letterSpacing: 1,
            }}
          >
            5 CURIOSIDADES
            <br />
            <span style={{ color: COLORS.ember }}>DE LA HISTORIA</span>
          </div>
        </Reveal>

        <Reveal delay={44} duration={22} distance={30}>
          <div
            style={{
              fontFamily: body,
              color: COLORS.slate,
              fontSize: 34,
              marginTop: 26,
              letterSpacing: 1,
            }}
          >
            que probablemente nadie te contó
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
