export const COLORS = {
  ink: "#0C0F13",
  ink2: "#151A21",
  bone: "#F2ECE1",
  ember: "#D9622B",
  brass: "#C9A227",
  slate: "#7E8894",
};

export const DUR = {
  intro: 105,
  scene: 330,
  outro: 150,
  transition: 18,
};

// 7 sequences, 6 transitions
export const TOTAL =
  DUR.intro + DUR.scene * 5 + DUR.outro - DUR.transition * 6;
