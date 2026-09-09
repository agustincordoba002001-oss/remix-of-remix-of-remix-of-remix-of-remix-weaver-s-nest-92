import { loadFont as loadDisplay } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadBody } from "@remotion/google-fonts/Barlow";

export const display = loadDisplay("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;

export const body = loadBody("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
}).fontFamily;
