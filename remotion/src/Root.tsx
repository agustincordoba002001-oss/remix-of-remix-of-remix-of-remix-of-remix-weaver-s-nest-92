import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { TOTAL } from "./theme";
import { LunaVideo } from "./luna/LunaVideo";
import { LUNA_TOTAL } from "./luna/escenas";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="luna"
      component={LunaVideo}
      durationInFrames={LUNA_TOTAL}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
