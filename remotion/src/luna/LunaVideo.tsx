import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { Grain } from "../components/Grain";
import { COLORS } from "../theme";
import { LUNA, LUNA_SCENES } from "./escenas";
import { LunaIntro } from "./LunaIntro";
import { LunaOutro } from "./LunaOutro";
import { LunaScene } from "./LunaScene";

export const LunaVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={LUNA.intro}>
        <LunaIntro duration={LUNA.intro} />
      </TransitionSeries.Sequence>

      {LUNA_SCENES.map((s, i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Transition
            presentation={
              i % 3 === 0
                ? wipe({ direction: "from-left" })
                : fade()
            }
            timing={
              i % 3 === 0
                ? springTiming({ config: { damping: 200 }, durationInFrames: LUNA.transition })
                : linearTiming({ durationInFrames: LUNA.transition })
            }
          />
          <TransitionSeries.Sequence durationInFrames={LUNA.scene}>
            <LunaScene
              data={s}
              index={i}
              total={LUNA_SCENES.length}
              duration={LUNA.scene}
            />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: LUNA.transition })}
      />
      <TransitionSeries.Sequence durationInFrames={LUNA.outro}>
        <LunaOutro duration={LUNA.outro} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Grain />
  </AbsoluteFill>
);
