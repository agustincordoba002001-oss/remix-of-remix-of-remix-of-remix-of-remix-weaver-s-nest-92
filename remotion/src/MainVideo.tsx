import React from "react";
import { AbsoluteFill } from "remotion";
import {
  TransitionSeries,
  springTiming,
  linearTiming,
} from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { DUR, COLORS } from "./theme";
import { Grain } from "./components/Grain";
import { Intro } from "./scenes/Intro";
import { Fact1 } from "./scenes/Fact1";
import { Fact2 } from "./scenes/Fact2";
import { Fact3 } from "./scenes/Fact3";
import { Fact4 } from "./scenes/Fact4";
import { Fact5 } from "./scenes/Fact5";
import { Outro } from "./scenes/Outro";

const wipeT = (direction: "from-left" | "from-right" | "from-bottom") => ({
  presentation: wipe({ direction }),
  timing: springTiming({
    config: { damping: 200 },
    durationInFrames: DUR.transition,
  }),
});

const fadeT = {
  presentation: fade(),
  timing: linearTiming({ durationInFrames: DUR.transition }),
};

export const MainVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={DUR.intro}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeT("from-bottom")} />

      <TransitionSeries.Sequence durationInFrames={DUR.scene}>
        <Fact1 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeT("from-left")} />

      <TransitionSeries.Sequence durationInFrames={DUR.scene}>
        <Fact2 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fadeT} />

      <TransitionSeries.Sequence durationInFrames={DUR.scene}>
        <Fact3 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeT("from-right")} />

      <TransitionSeries.Sequence durationInFrames={DUR.scene}>
        <Fact4 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...wipeT("from-left")} />

      <TransitionSeries.Sequence durationInFrames={DUR.scene}>
        <Fact5 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fadeT} />

      <TransitionSeries.Sequence durationInFrames={DUR.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>

    <Grain />
  </AbsoluteFill>
);
