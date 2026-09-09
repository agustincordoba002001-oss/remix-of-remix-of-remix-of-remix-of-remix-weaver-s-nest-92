import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  delay?: number;
  duration?: number;
  from?: "up" | "down" | "left";
  distance?: number;
  blur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

/** Default entrance for the whole piece: clip-reveal + blur-to-sharp drift. */
export const Reveal: React.FC<Props> = ({
  delay = 0,
  duration = 26,
  from = "up",
  distance = 60,
  blur = 12,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });

  const axis =
    from === "left"
      ? `translateX(${(1 - t) * -distance}px)`
      : `translateY(${(1 - t) * (from === "up" ? distance : -distance)}px)`;

  const clip =
    from === "left"
      ? `inset(0 ${(1 - t) * 100}% 0 0)`
      : from === "up"
        ? `inset(0 0 ${(1 - t) * 100}% 0)`
        : `inset(${(1 - t) * 100}% 0 0 0)`;

  return (
    <div
      style={{
        ...style,
        opacity: interpolate(t, [0, 0.25], [0, 1], {
          extrapolateRight: "clamp",
        }),
        transform: axis,
        filter: `blur(${(1 - t) * blur}px)`,
        clipPath: clip,
        willChange: "transform, filter",
      }}
    >
      {children}
    </div>
  );
};
