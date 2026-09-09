import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { body, display } from "../fonts";
import { Reveal } from "./Reveal";

export const BigNumber: React.FC<{
  value: string;
  delay?: number;
  size?: number;
  color?: string;
}> = ({ value, delay = 0, size = 300, color = "rgba(242,236,225,0.10)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 90, mass: 1.4 },
  });
  const float = Math.sin((frame - delay) / 34) * 6;

  return (
    <div
      style={{
        fontFamily: display,
        fontSize: size,
        lineHeight: 0.8,
        color,
        transform: `scale(${interpolate(s, [0, 1], [1.35, 1])}) translateY(${float}px)`,
        opacity: interpolate(s, [0, 0.4], [0, 1], {
          extrapolateRight: "clamp",
        }),
      }}
    >
      {value}
    </div>
  );
};

export const Kicker: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => (
  <Reveal delay={delay} duration={20} from="left" distance={50} blur={6}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: body,
        fontWeight: 600,
        fontSize: 24,
        letterSpacing: 7,
        color: COLORS.brass,
      }}
    >
      <span style={{ width: 46, height: 3, background: COLORS.ember }} />
      {text}
    </div>
  </Reveal>
);

export const Headline: React.FC<{
  text: React.ReactNode;
  delay?: number;
  size?: number;
  align?: "left" | "right";
}> = ({ text, delay = 0, size = 118, align = "left" }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 330], [0, -18]);
  return (
    <Reveal delay={delay} duration={32} distance={70} blur={16}>
      <div
        style={{
          fontFamily: display,
          fontSize: size,
          lineHeight: 0.9,
          color: COLORS.bone,
          textAlign: align,
          transform: `translateY(${drift}px)`,
          textShadow: "0 18px 60px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </div>
    </Reveal>
  );
};

export const Body: React.FC<{
  text: string;
  delay?: number;
  width?: number;
  align?: "left" | "right";
}> = ({ text, delay = 0, width = 760, align = "left" }) => (
  <Reveal delay={delay} duration={26} distance={34} blur={8}>
    <div
      style={{
        fontFamily: body,
        fontSize: 33,
        lineHeight: 1.42,
        color: "rgba(242,236,225,0.74)",
        maxWidth: width,
        textAlign: align,
        borderTop: `1px solid rgba(201,162,39,0.35)`,
        paddingTop: 22,
        marginLeft: align === "right" ? "auto" : 0,
      }}
    >
      {text}
    </div>
  </Reveal>
);
