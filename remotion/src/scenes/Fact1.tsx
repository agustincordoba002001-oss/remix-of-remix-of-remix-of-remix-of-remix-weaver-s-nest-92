import React from "react";
import { AbsoluteFill } from "remotion";
import { PhotoLayer } from "../components/PhotoLayer";
import { BigNumber, Kicker, Headline, Body } from "../components/FactBits";
import { COLORS } from "../theme";

export const Fact1: React.FC = () => (
  <AbsoluteFill>
    <PhotoLayer
      src="images/eiffel.jpg"
      zoomFrom={1.04}
      zoomTo={1.18}
      panY={-30}
      opacity={0.55}
    />
    <div style={{ position: "absolute", right: 90, top: 60 }}>
      <BigNumber value="01" delay={6} size={340} />
    </div>
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        paddingLeft: 130,
        paddingBottom: 130,
        paddingRight: 620,
      }}
    >
      <Kicker text="PARÍS · 1889" delay={8} />
      <div style={{ height: 26 }} />
      <Headline
        text={
          <>
            LA TORRE EIFFEL
            <br />
            CRECE <span style={{ color: COLORS.ember }}>15 CM</span> EN VERANO
          </>
        }
        delay={18}
        size={112}
      />
      <div style={{ height: 34 }} />
      <Body
        text="El hierro se expande con el calor. En los días más calurosos la estructura se estira y la punta puede quedar hasta 15 centímetros más alta."
        delay={46}
      />
    </AbsoluteFill>
  </AbsoluteFill>
);
