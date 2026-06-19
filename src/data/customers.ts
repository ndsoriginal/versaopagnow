export const PIX_CUSTOMERS = [
  { name: "Lucas Silva", email: "lucas.silva45@gmail.com", cpf: "47281936592" },
  { name: "Ana Oliveira", email: "ana.oliveira78@gmail.com", cpf: "39174620814" },
  { name: "Pedro Santos", email: "pedro.santos23@gmail.com", cpf: "58412793605" },
  { name: "Julia Costa", email: "julia.costa67@gmail.com", cpf: "21785930481" },
  { name: "Gabriel Almeida", email: "gabriel.almeida12@gmail.com", cpf: "63829457139" },
  { name: "Beatriz Ferreira", email: "beatriz.ferreira89@gmail.com", cpf: "17590348276" },
  { name: "Rafael Souza", email: "rafael.souza34@gmail.com", cpf: "49682175302" },
  { name: "Laura Rodrigues", email: "laura.rodrigues56@gmail.com", cpf: "82314769045" },
  { name: "Mateus Pereira", email: "mateus.pereira91@gmail.com", cpf: "30165827498" },
  { name: "Sofia Carvalho", email: "sofia.carvalho33@gmail.com", cpf: "75920481367" },
  { name: "Enzo Martins", email: "enzo.martins44@gmail.com", cpf: "18437652910" },
  { name: "Manuela Barbosa", email: "manuela.barbosa27@gmail.com", cpf: "61298534756" },
  { name: "Felipe Lima", email: "felipe.lima80@gmail.com", cpf: "93567241809" },
  { name: "Alice Ribeiro", email: "alice.ribeiro65@gmail.com", cpf: "27849310634" },
  { name: "Gustavo Melo", email: "gustavo.melo19@gmail.com", cpf: "54683179281" },
  { name: "Isabela Cardoso", email: "isabela.cardoso72@gmail.com", cpf: "10976458327" },
  { name: "Bruno Gomes", email: "bruno.gomes41@gmail.com", cpf: "86732519460" },
  { name: "Larissa Araújo", email: "larissa.araujo85@gmail.com", cpf: "42317895643" },
  { name: "João Nascimento", email: "joao.nascimento29@gmail.com", cpf: "79045628195" },
  { name: "Maria Monteiro", email: "maria.monteiro63@gmail.com", cpf: "35691287408" }
];

export const getRandomCustomer = () => {
  return PIX_CUSTOMERS[Math.floor(Math.random() * PIX_CUSTOMERS.length)];
};