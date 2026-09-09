import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { BigNumber, Kicker, Headline, Body } from "../components/FactBits";
import { COLORS } from "../theme";
import { display } from "../fonts";

export const Fact5: React.FC = () => {
  const frame = useCurrentFrame();
  const years = Math.round(
    interpolate(frame, [70, 130], [0, 29], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (x) => 1 - Math.pow(1 - x, 3),
    })
  );
  const yOp = interpolate(frame, [66, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <PhotoLayer
        src="images/jungla.jpg"
        zoomFrom={1.2}
        zoomTo={1.04}
        panX={-20}
        panY={10}
        opacity={0.66}
      />
      <div style={{ position: "absolute", left: 120, top: 80 }}>
        <BigNumber value="05" delay={4} size={300} />
      </div>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          paddingLeft: 130,
          paddingBottom: 120,
          paddingRight: 200,
        }}
      >
        <Kicker text="FILIPINAS · 1974" delay={8} />
        <div style={{ height: 26 }} />
        <Headline
          text={
            <>
              PARA UN SOLDADO, LA SEGUNDA
              <br />
              GUERRA TERMINÓ EN{" "}
              <span style={{ color: COLORS.ember }}>1974</span>
            </>
          }
          delay={16}
          size={104}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 20,
            marginTop: 30,
            opacity: yOp,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: 128,
              lineHeight: 0.9,
              color: COLORS.brass,
            }}
          >
            {years}
          </div>
          <div
            style={{
              fontFamily: display,
              fontSize: 46,
              color: "rgba(242,236,225,0.7)",
              letterSpacing: 4,
            }}
          >
            AÑOS ESCONDIDO
          </div>
        </div>
        <div style={{ height: 26 }} />
        <Body
          text="Hiroo Onoda siguió combatiendo en la jungla hasta que su antiguo oficial viajó a buscarlo y le entregó, en persona, la orden de rendirse."
          delay={140}
          width={900}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
