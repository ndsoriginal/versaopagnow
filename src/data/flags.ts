export type FlagOption = {
  label: string;
  language: string;
  flag: string;
  description: string;
};

export const FLAG_OPTIONS: FlagOption[] = [
  {
    label: "Brasil",
    language: "Português (BR)",
    flag: "/bandeiras/bandeiradobrasil-2-cke.webp",
    description: "Suporte completo em português",
  },
  {
    label: "Estados Unidos",
    language: "English",
    flag: "/bandeiras/Flag_of_the_United_States.svg",
    description: "Comunicação em inglês",
  },
  {
    label: "Rússia",
    language: "русский",
    flag: "/bandeiras/Flag_of_Russia.svg",
    description: "Mensagens em russo",
  },
  {
    label: "Tailândia",
    language: "ไทย",
    flag: "/bandeiras/Flag_of_Thailand.svg",
    description: "Conteúdo em tailandês",
  },
  {
    label: "China",
    language: "中文",
    flag: "/bandeiras/Flag_of_the_People's_Republic_of_China.svg.png",
    description: "Suporte em mandarim",
  },
  {
    label: "Emirados Árabes",
    language: "العربية",
    flag: "/bandeiras/Flag_of_the_United_Arab_Emirates.svg.png",
    description: "Informações em árabe",
  },
  {
    label: "Alemanha",
    language: "Deutsch",
    flag: "/bandeiras/Flag_of_Germany.svg",
    description: "Notificações em alemão",
  },
];