import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { COLORS } from "../theme";
import { body, display } from "../fonts";
import type { LunaScene as SceneData } from "./escenas";

type Props = { data: SceneData; index: number; total: number; duration: number };

export const LunaScene: React.FC<Props> = ({ data, index, total, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kicker = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const words = data.texto.split(" ");
  const barW = interpolate(frame, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [duration - 14, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, opacity: out }}>
      <PhotoLayer
        src={data.imagen}
        duration={duration}
        opacity={0.62}
        panX={data.panX}
        panY={data.panY}
        zoomFrom={data.zoomFrom}
        zoomTo={data.zoomTo}
      />

      <AbsoluteFill
        style={{
          padding: "0 130px 0 118px",
          justifyContent: "flex-end",
          paddingBottom: 132,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 22,
            opacity: kicker,
            transform: `translateX(${interpolate(kicker, [0, 1], [-26, 0])}px)`,
          }}
        >
          <div style={{ width: 54, height: 3, background: COLORS.ember }} />
          <span
            style={{
              fontFamily: display,
              color: COLORS.brass,
              fontSize: 30,
              letterSpacing: 6,
              whiteSpace: "nowrap",
            }}
          >
            {data.seccion}
          </span>
        </div>

        <div
          style={{
            fontFamily: body,
            color: COLORS.bone,
            fontSize: 52,
            lineHeight: 1.28,
            maxWidth: 1240,
            fontWeight: 400,
            textShadow: "0 6px 34px rgba(0,0,0,0.85)",
          }}
        >
          {words.map((w, i) => {
            const start = 10 + i * 2.1;
            const o = interpolate(frame, [start, start + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const y = interpolate(o, [0, 1], [14, 0]);
            const blur = interpolate(o, [0, 1], [7, 0]);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: o,
                  transform: `translateY(${y}px)`,
                  filter: `blur(${blur}px)`,
                  marginRight: "0.28em",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* scene counter + progress */}
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 92,
          fontFamily: display,
          fontSize: 34,
          color: COLORS.slate,
          letterSpacing: 4,
        }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      <div
        style={{
          position: "absolute",
          left: 118,
          bottom: 86,
          width: 1240,
          height: 2,
          background: "rgba(242,236,225,0.14)",
        }}
      >
        <div
          style={{
            width: `${barW * 100}%`,
            height: "100%",
            background: COLORS.ember,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
