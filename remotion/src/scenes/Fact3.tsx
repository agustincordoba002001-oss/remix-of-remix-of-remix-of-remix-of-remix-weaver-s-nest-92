import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { BigNumber, Kicker, Headline, Body } from "../components/FactBits";
import { COLORS } from "../theme";

export const Fact3: React.FC = () => {
  const frame = useCurrentFrame();
  const rule = interpolate(frame, [8, 60], [0, 620], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });

  return (
    <AbsoluteFill>
      <PhotoLayer
        src="images/oxford.jpg"
        zoomFrom={1.02}
        zoomTo={1.16}
        panY={-18}
        opacity={0.72}
      />
      <div
        style={{
          position: "absolute",
          left: 460,
          top: 230,
          width: 3,
          height: rule,
          background: `linear-gradient(180deg, ${COLORS.ember}, rgba(217,98,43,0))`,
        }}
      />
      <div style={{ position: "absolute", left: 120, top: 250 }}>
        <BigNumber value="03" delay={2} size={280} color="rgba(201,162,39,0.22)" />
      </div>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: 540,
          paddingRight: 150,
        }}
      >
        <Kicker text="OXFORD · 1096" delay={10} />
        <div style={{ height: 26 }} />
        <Headline
          text={
            <>
              OXFORD YA DABA CLASES
              <br />
              ANTES DE QUE EXISTIERA
              <br />
              EL <span style={{ color: COLORS.ember }}>IMPERIO AZTECA</span>
            </>
          }
          delay={20}
          size={100}
        />
        <div style={{ height: 36 }} />
        <Body
          text="Cuando se fundó Tenochtitlán, en 1325, la universidad llevaba más de dos siglos dando lecciones."
          delay={52}
          width={840}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
