import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BigNumber, Kicker, Headline, Body } from "../components/FactBits";
import { COLORS } from "../theme";
import { body } from "../fonts";
import { Reveal } from "../components/Reveal";

export const Fact4: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 30], [100, 0], {
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const scale = interpolate(frame, [0, 330], [1.02, 1.14]);
  const barW = interpolate(frame, [60, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "46%",
          overflow: "hidden",
          clipPath: `inset(0 0 ${reveal}% 0)`,
        }}
      >
        <Img
          src={staticFile("images/napoleon.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "60% 30%",
            transform: `scale(${scale})`,
            filter: "saturate(0.75) contrast(1.05)",
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(90deg, rgba(12,15,19,0.45) 0%, rgba(12,15,19,0) 55%, ${COLORS.ink} 100%)`,
          }}
        />
      </div>

      <div style={{ position: "absolute", right: 110, bottom: 90 }}>
        <BigNumber value="04" delay={8} size={300} />
      </div>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: "50%",
          paddingRight: 130,
        }}
      >
        <Kicker text="FRANCIA · 1804" delay={12} />
        <div style={{ height: 24 }} />
        <Headline
          text={
            <>
              NAPOLEÓN
              <br />
              <span style={{ color: COLORS.ember }}>NO ERA BAJO</span>
            </>
          }
          delay={22}
          size={150}
        />
        <div style={{ height: 34 }} />
        <Reveal delay={56} duration={22} from="left" distance={40}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 18,
              fontFamily: body,
              color: COLORS.bone,
            }}
          >
            <div style={{ fontSize: 74, fontWeight: 600, lineHeight: 1 }}>
              1,69 m
            </div>
            <div
              style={{
                fontSize: 24,
                color: COLORS.slate,
                letterSpacing: 3,
                paddingBottom: 12,
              }}
            >
              PROMEDIO DE SU ÉPOCA
            </div>
          </div>
          <div
            style={{
              height: 6,
              width: 520 * barW,
              background: COLORS.brass,
              marginTop: 16,
            }}
          />
        </Reveal>
        <div style={{ height: 32 }} />
        <Body
          text="El mito del emperador diminuto nació de las caricaturas británicas y de una confusión entre pulgadas francesas e inglesas."
          delay={92}
          width={700}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
