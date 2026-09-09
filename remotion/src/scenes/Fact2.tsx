import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { BigNumber, Kicker, Headline, Body } from "../components/FactBits";
import { COLORS } from "../theme";
import { body } from "../fonts";
import { Reveal } from "../components/Reveal";

const Marker: React.FC<{ label: string; year: string; x: number; delay: number }> = ({
  label,
  year,
  x,
  delay,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: -14, opacity: t }}>
      <div
        style={{
          width: 3,
          height: 30 * t,
          background: COLORS.ember,
        }}
      />
      <div
        style={{
          fontFamily: body,
          fontSize: 22,
          color: COLORS.bone,
          marginTop: 10,
          letterSpacing: 2,
          transform: "translateX(-8px)",
          whiteSpace: "nowrap",
        }}
      >
        {year}
        <div style={{ color: COLORS.slate, fontSize: 18, letterSpacing: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
};

export const Fact2: React.FC = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [30, 110], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <PhotoLayer
        src="images/piramide.jpg"
        zoomFrom={1.16}
        zoomTo={1.02}
        panX={26}
        opacity={0.6}
      />
      <div style={{ position: "absolute", left: 100, top: 70 }}>
        <BigNumber value="02" delay={4} size={320} />
      </div>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-end",
          paddingRight: 120,
          paddingLeft: 560,
        }}
      >
        <Kicker text="EGIPTO · ROMA" delay={6} />
        <div style={{ height: 24 }} />
        <Headline
          text={
            <>
              CLEOPATRA VIVIÓ MÁS CERCA
              <br />
              DEL <span style={{ color: COLORS.ember }}>ALUNIZAJE</span>
              <br />
              QUE DE LAS PIRÁMIDES
            </>
          }
          delay={14}
          size={96}
          align="right"
        />
        <div style={{ height: 40 }} />
        <div style={{ width: 720, position: "relative", height: 96 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 2,
              width: `${line}%`,
              background: "rgba(242,236,225,0.35)",
            }}
          />
          <Marker label="PIRÁMIDE" year="2560 a.C." x={0} delay={44} />
          <Marker label="CLEOPATRA" year="30 a.C." x={62} delay={64} />
          <Marker label="APOLO 11" year="1969" x={92} delay={84} />
        </div>
        <Reveal delay={100} duration={24} distance={28}>
          <Body
            text="2.500 años la separaban de la Gran Pirámide. Del primer paso en la Luna, solo 2.000."
            width={640}
            align="right"
          />
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
