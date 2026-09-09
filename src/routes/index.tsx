import { createFileRoute } from "@tanstack/react-router";

import { Editor } from "./editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Editor de voz del video · frase por frase" },
      {
        name: "description",
        content:
          "Subí tu video, seguí la narración frase por frase en el minuto exacto, escuchá pruebas de voz y grabá tu propia forma de decirlo para que la narración te imite.",
      },
      { property: "og:title", content: "Editor de voz del video" },
      {
        property: "og:description",
        content:
          "Editá el audio del video en el segundo exacto: reescribí la frase o grabala con tu voz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Editor,
});
