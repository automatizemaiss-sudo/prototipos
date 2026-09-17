export const TEAMS = [
  "Flamengo",
  "Corinthians",
  "Palmeiras",
  "São Paulo",
  "Santos",
  "Grêmio",
  "Real Madrid",
  "Barcelona",
  "Seleção Brasileira",
];
export const TYPES = ["Retrô", "Jogador", "Torcedor", "Personalizada"];
export const STAGES = [
  "Novo contato",
  "Em atendimento",
  "Interesse definido",
  "Aguardando pagamento",
  "Venda concluída",
  "Perdido",
];
export const ALLOWED = ["+5542999883017", "+5511981205438"];
export function normalizePhone(v) {
  let n = String(v).replace(/\D/g, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  if (!/^55\d{10,11}$/.test(n))
    throw new Error("Informe um telefone brasileiro válido, com DDD.");
  return "+" + n;
}
export function inactive(c, now = new Date()) {
  return (
    c.bought &&
    !!c.lastPurchase &&
    (now - new Date(c.lastPurchase + "T12:00:00")) / 86400000 > 90
  );
}
export function matches(c, f = {}) {
  return (
    (!f.search ||
      `${c.name} ${c.phone}`.toLowerCase().includes(f.search.toLowerCase()) ||
      c.phone
        .replace(/\D/g, "")
        .includes(f.search.replace(/\D/g, "") || "not-number")) &&
    (!f.team || c.teams.includes(f.team)) &&
    (!f.type || c.types.includes(f.type)) &&
    (!f.size || c.size === f.size) &&
    (!f.origin || c.origin === f.origin) &&
    (!f.city || c.city.toLowerCase().includes(f.city.toLowerCase())) &&
    (!f.state || c.state === f.state.toUpperCase()) &&
    (!f.bought ||
      (f.bought === "yes"
        ? c.bought
        : f.bought === "inactive"
          ? inactive(c)
          : !c.bought)) &&
    (!f.from || (!!c.lastPurchase && c.lastPurchase >= f.from)) &&
    (!f.to || (!!c.lastPurchase && c.lastPurchase <= f.to))
  );
}
export function audience(contacts) {
  let seen = new Set();
  return contacts.filter((c) => {
    let p;
    try {
      p = normalizePhone(c.phone);
    } catch {
      return false;
    }
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}
export function realAudience(contacts) {
  return audience(contacts).filter(
    (c) => !c.demo && ALLOWED.includes(normalizePhone(c.phone)),
  );
}
export function validateCampaign(c) {
  if (!c.name.trim()) throw new Error("Informe o nome da campanha.");
  if (!c.message.trim()) throw new Error("Escreva uma mensagem.");
  if (
    !Number.isFinite(+c.min) ||
    !Number.isFinite(+c.max) ||
    +c.min < 1 ||
    +c.max < +c.min
  )
    throw new Error(
      "Use intervalos positivos, com máximo maior ou igual ao mínimo.",
    );
}
export function seed() {
  const names = [
    "Lucas Almeida",
    "Mariana Costa",
    "Pedro Oliveira",
    "Ana Santos",
    "Rafael Lima",
    "Beatriz Souza",
    "Gabriel Rocha",
    "Julia Martins",
    "Felipe Ribeiro",
    "Camila Pereira",
    "Bruno Alves",
    "Larissa Gomes",
    "Diego Fernandes",
    "Isabela Dias",
    "Thiago Nunes",
    "Amanda Silva",
    "Vinícius Barros",
    "Carolina Melo",
    "Gustavo Freitas",
    "Letícia Castro",
    "André Teixeira",
    "Natália Ramos",
    "Henrique Cardoso",
    "Sofia Azevedo",
  ];
  let contacts = names.map((n, i) => ({
    id: "c" + i,
    name: n,
    phone: "+550000000" + String(i).padStart(4, "0"),
    city: ["São Paulo", "Ponta Grossa", "Curitiba", "Rio de Janeiro"][i % 4],
    state: ["SP", "PR", "PR", "RJ"][i % 4],
    origin: ["Instagram", "WhatsApp", "Loja física"][i % 3],
    teams: [
      TEAMS[i % TEAMS.length],
      ...(i % 4 === 0 ? [TEAMS[(i + 2) % TEAMS.length]] : []),
    ],
    types: [TYPES[i % 4], ...(i % 5 === 0 ? ["Torcedor"] : [])].filter(
      (x, j, a) => a.indexOf(x) === j,
    ),
    size: ["P", "M", "G", "GG"][i % 4],
    bought: i % 3 !== 0,
    lastPurchase: i % 3 === 0 ? "" : i % 2 === 0 ? "2026-04-12" : "2026-09-01",
    notes: "Contato fictício para demonstração. Não enviar mensagens.",
    demo: true,
    updatedAt: new Date().toISOString(),
  }));
  contacts.push(
    ...["Matheus Donha", "Gui Brito"].map((name, i) => ({
      id: "test" + i,
      name,
      phone: ALLOWED[i],
      city: "",
      state: "",
      origin: "WhatsApp",
      teams: [],
      types: [],
      size: "",
      bought: false,
      lastPurchase: "",
      notes: "Contato autorizado exclusivamente para teste.",
      demo: false,
      updatedAt: new Date().toISOString(),
    })),
  );
  return {
    contacts,
    segments: [
      {
        id: "s1",
        name: "A paixão pelo retrô",
        description: "Contatos com interesse em camisas retrô",
        filters: { type: "Retrô" },
      },
      {
        id: "s2",
        name: "Primeira camisa, primeira compra",
        description: "Interessados que ainda não compraram",
        filters: { bought: "no" },
      },
      {
        id: "s3",
        name: "Hora de voltar ao jogo",
        description: "Clientes sem comprar há mais de 90 dias",
        filters: { bought: "inactive" },
      },
    ],
    opportunities: contacts
      .slice(0, 12)
      .map((c, i) => ({
        id: "o" + i,
        contactId: c.id,
        title: `${c.teams[0]} · ${c.types[0]}`,
        stage: i % 6,
        notes: "Oportunidade demonstrativa",
        updatedAt: new Date().toISOString(),
      })),
    campaigns: [],
  };
}
