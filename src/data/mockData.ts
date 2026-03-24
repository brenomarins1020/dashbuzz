export type ContentStatus = "Publicada" | "Não Começado" | "Em Andamento";
export type ContentType = "Instagram" | "Blog" | string;
export type ContentCategory = "Institucional" | "Autoridade" | "Portfólio";

export interface ContentItem {
  id: number;
  number: number;
  title: string;
  type: ContentType;
  responsible: string;
  details: string;
  status: ContentStatus;
  date: string;
  canvaLink: string;
  interactions: number;
  likes: number;
  engagement: number;
  timeToMake: number;
  category: ContentCategory;
}

export const mockData: ContentItem[] = [
  {
    id: 1, number: 1, title: "Time Projec 2026", type: "Instagram", responsible: "Urso",
    details: "Apresentação oficial da nova equipe e gestão 2026.",
    status: "Publicada", date: "2026-01-20", canvaLink: "https://www.canva.com/",
    interactions: 4765, likes: 130, engagement: 36.65, timeToMake: 0, category: "Institucional",
  },
  {
    id: 2, number: 2, title: "Unicamp Nota Máxima", type: "Instagram", responsible: "Urso",
    details: "Post informativo sobre as notas máximas da Unicamp no MEC.",
    status: "Publicada", date: "2026-01-27", canvaLink: "https://www.canva.com/",
    interactions: 4803, likes: 127, engagement: 37.82, timeToMake: 7, category: "Autoridade",
  },
  {
    id: 3, number: 3, title: "PROJETO LEONARDO", type: "Instagram", responsible: "Mayumi",
    details: "Falar para alguém de projetos fazer renders, pegar o relatório do projeto, colocar no chat e fazer um texto para o post.",
    status: "Publicada", date: "2026-02-10", canvaLink: "https://www.canva.com/",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 14, category: "Portfólio",
  },
  {
    id: 4, number: 3, title: "PROJETO LEONARDO", type: "Blog", responsible: "Breno",
    details: "Falar para alguém de projetos fazer renders, pegar o relatório do projeto, colocar no chat e fazer um texto para o post.",
    status: "Publicada", date: "2026-02-10", canvaLink: "https://www.projecjunior.com/",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 14, category: "Portfólio",
  },
  {
    id: 5, number: 4, title: "Por que contratar uma Empresa Júnior de Engenharia e Arquitetura vale a pena?",
    type: "Blog", responsible: "", details: "Comentar sobre o porquê vale a pena contratar uma empresa júnior e porque a projec.",
    status: "Não Começado", date: "2026-02-17", canvaLink: "",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 7, category: "Autoridade",
  },
  {
    id: 6, number: 5, title: "Capacitação em projetos elétricos", type: "Instagram", responsible: "",
    details: "Mostrar projetos elétricos antigos / depoimentos de 2 pessoas e suas fotos (de quem está fazendo).",
    status: "Não Começado", date: "2026-02-24", canvaLink: "",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 7, category: "Autoridade",
  },
  {
    id: 7, number: 6, title: "Volta às Aulas", type: "Instagram", responsible: "",
    details: "Venha fazer parte do time projec! - ps estará aberto nesse dia.",
    status: "Não Começado", date: "2026-02-23", canvaLink: "",
    interactions: 0, likes: 0, engagement: 0, timeToMake: -1, category: "Institucional",
  },
  {
    id: 8, number: 7, title: "Dicas de Engenharia Civil", type: "Instagram", responsible: "Urso",
    details: "Dicas práticas para estudantes de engenharia civil.",
    status: "Em Andamento", date: "2026-03-03", canvaLink: "",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 5, category: "Autoridade",
  },
  {
    id: 9, number: 8, title: "Case de Sucesso - Reforma", type: "Blog", responsible: "Mayumi",
    details: "Apresentar case de sucesso de uma reforma residencial completa.",
    status: "Em Andamento", date: "2026-03-10", canvaLink: "",
    interactions: 0, likes: 0, engagement: 0, timeToMake: 10, category: "Portfólio",
  },
];
