export type CustomGame = {
  id: string;
  name: string;
  route: string;
  thumbnail: string;
  description: string;
  provider: string;
};

export const CUSTOM_GAMES: CustomGame[] = [
  {
    id: "double",
    name: "Double",
    route: "/double",
    thumbnail: "/Jogos/double.jpg",
    description: "Aposte em Red, Black ou White e multiplique seus ganhos",
    provider: "Novopix",
  },
  {
    id: "mines",
    name: "Mines",
    route: "/mines",
    thumbnail: "/Jogos/mines.jpg",
    description: "Evite as minas e colete diamantes",
    provider: "Novopix",
  },
  {
    id: "aviator",
    name: "Aviator",
    route: "/aviator",
    thumbnail: "/Jogos/aviator.jpg",
    description: "O clássico jogo do foguete",
    provider: "Novopix",
  },
];
