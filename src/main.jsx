import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Columns3,
  Send,
  Plug,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronRight,
  X,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shirt,
  Target,
  MoreHorizontal,
  RefreshCw,
  HelpCircle,
  ChevronLeft,
  Download,
  Trash2,
} from "lucide-react";
import {
  TEAMS,
  TYPES,
  STAGES,
  seed,
  matches,
  inactive,
  normalizePhone,
  audience,
  realAudience,
  validateCampaign,
} from "./domain";
import "./style.css";
import { request, SHEET_URL } from "./api";
const donutBackground = (contacts) => {
  let counts = TYPES.map(
      (t) => contacts.filter((c) => c.types.includes(t)).length,
    ),
    sum = counts.reduce((a, b) => a + b, 0),
    n = 0;
  return sum
    ? "conic-gradient(" +
        counts
          .map((c, i) => {
            let start = n;
            n += (c / sum) * 100;
            return (
              ["#161616", "#696969", "#aaa", "#dedede"][i] +
              " " +
              start +
              "% " +
              n +
              "%"
            );
          })
          .join(",") +
        ")"
    : "#eee";
};
const nav = [
  ["Dashboard", LayoutDashboard],
  ["Contatos", Users],
  ["Segmentações", SlidersHorizontal],
  ["CRM", Columns3],
  ["Campanhas", Send],
  ["Integrações", Plug],
];
const empty = {
  name: "",
  phone: "",
  city: "",
  state: "",
  origin: "WhatsApp",
  teams: [],
  types: [],
  size: "",
  bought: false,
  lastPurchase: "",
  notes: "",
  demo: true,
};
const date = (v) => new Date(v).toLocaleDateString("pt-BR");
function App() {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("flying-crm-v1")) || seed();
    } catch {
      return seed();
    }
  });
  const [connections, setConnections] = useState({}),
    [busy, setBusy] = useState(false),
    [syncBase, setSyncBase] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("flying-sync-base")) || [];
      } catch {
        return [];
      }
    }),
    [lastSync, setLastSync] = useState(
      localStorage.getItem("flying-last-sync") || "",
    ),
    [conflicts, setConflicts] = useState([]);
  useEffect(() => {
    request("status")
      .then(setConnections)
      .catch(() => {});
  }, []);
  const [page, setPage] = useState("Dashboard"),
    [filter, setFilter] = useState({}),
    [selected, setSelected] = useState([]),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [draft, setDraft] = useState({}),
    [step, setStep] = useState(0),
    [help, setHelp] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("flying-crm-v1", JSON.stringify(data));
    } catch {
      setToast("Armazenamento cheio. Exporte seus dados antes de continuar.");
    }
  }, [data]);
  useEffect(() => {
    if (toast) {
      let t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!modal && !help) return;
    const previous = document.activeElement;
    const dialog = document.querySelector("[role=dialog]");
    const focusable = () => [
      ...dialog.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,a[href]",
      ),
    ];
    focusable()[0]?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setHelp(false);
      }
      if (e.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal, help]);
  const update = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const open = (kind, v = {}) => {
    setError("");
    setDraft(structuredClone(v));
    setModal(kind);
  };
  const close = () => {
    setModal(null);
    setError("");
  };
  const go = (p) => {
    setPage(p);
    setFilter({});
    setSelected([]);
  };
  const list = data.contacts.filter((c) => matches(c, filter));
  const counts = {
    contacts: data.contacts.length,
    bought: data.contacts.filter((c) => c.bought).length,
    inactive: data.contacts.filter((c) => inactive(c)).length,
    open: data.opportunities.filter((o) => o.stage < 4).length,
  };
  const newCampaign = (ids) => {
    setStep(0);
    open("campaign", {
      name: "",
      message: "Olá, {nome}! Tudo bem? Aqui é da Flying Imports. ⚽",
      id: crypto.randomUUID(),
      min: 15,
      max: 30,
      ids: ids || [],
      segment: "",
      mediaType: "",
      mediaUrl: "",
    });
  };
  const picked = draft.segment
    ? data.contacts.filter((c) =>
        matches(c, data.segments.find((s) => s.id === draft.segment)?.filters),
      )
    : data.contacts.filter((c) => draft.ids?.includes(c.id));
  const field = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const totalSim = data.campaigns
    .filter((c) => !c.real)
    .reduce((s, c) => s + (c.processed || 0), 0);
  const realCampaigns = data.campaigns.filter((c) => c.real),
    apiAccepted = realCampaigns.reduce((s, c) => s + (c.apiAccepted || 0), 0),
    apiFailed = realCampaigns.reduce(
      (s, c) =>
        s + (c.messages || []).filter((m) => m.status === "Failed").length,
      0,
    );
  const saveContact = (e) => {
    e.preventDefault();
    try {
      let phone =
        draft.demo && draft.phone.startsWith("+550000000")
          ? draft.phone
          : normalizePhone(draft.phone);
      if (
        data.contacts.some(
          (c) => c.id !== draft.id && normalizeSafe(c.phone) === phone,
        )
      )
        throw Error(
          "Este telefone já existe. Abra o contato existente para revisar os dados.",
        );
      let c = {
        ...draft,
        phone,
        id: draft.id || crypto.randomUUID(),
        lastPurchase: draft.bought ? draft.lastPurchase : "",
        demo: draft.id ? draft.demo : true,
        updatedAt: new Date().toISOString(),
      };
      update(
        "contacts",
        draft.id
          ? data.contacts.map((x) => (x.id === c.id ? c : x))
          : [...data.contacts, c],
      );
      close();
      setToast("Contato salvo.");
    } catch (e) {
      setError(e.message);
    }
  };
  function ContactTable({ rows, selectable = true }) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th>
                  <input
                    aria-label="Selecionar todos os contatos filtrados"
                    type="checkbox"
                    checked={
                      rows.length > 0 &&
                      rows.every((c) => selected.includes(c.id))
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? rows.map((c) => c.id) : [])
                    }
                  />
                </th>
              )}
              <th>Contato</th>
              <th>Interesses</th>
              <th>Tipo de camisa</th>
              <th>Origem</th>
              <th>Última compra</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                {selectable && (
                  <td>
                    <input
                      aria-label={"Selecionar " + c.name}
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, c.id]
                            : selected.filter((id) => id !== c.id),
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <button className="person" onClick={() => open("contact", c)}>
                    <span className="avatar">
                      {c.name
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {c.demo ? "Fictício · " : ""}
                        {c.phone}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <div className="tags">
                    {c.teams.length ? (
                      c.teams.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Não informado</span>
                    )}
                  </div>
                </td>
                <td>{c.types.join(", ") || "—"}</td>
                <td>
                  <span className="origin">{c.origin}</span>
                </td>
                <td>
                  {c.lastPurchase ? (
                    date(c.lastPurchase + "T12:00:00")
                  ) : (
                    <span className="muted">Ainda não comprou</span>
                  )}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={"Editar " + c.name}
                    onClick={() => open("contact", c)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty text="Nenhum contato encontrado. Ajuste os filtros ou adicione um contato." />
        )}
      </div>
    );
  }
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brand-mark">
            FI<span>↗</span>
          </div>
          <div>
            <strong>FLYING IMPORTS</strong>
            <small>RELACIONAMENTO EM JOGO</small>
          </div>
        </div>
        <div className="workspace-label">ESPAÇO DE TRABALHO</div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={page === label ? "active" : ""}
              onClick={() => go(label)}
            >
              <Icon size={19} />
              {label}
              {label === "Contatos" && <span>{data.contacts.length}</span>}
              {page === label && label !== "Contatos" && (
                <ChevronRight size={15} className="nav-arrow" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-box">
            <span className="live-dot" /> Ambiente de demonstração
            <small>Dados fictícios. Possibilidades reais.</small>
          </div>
          <button className="help" onClick={() => setHelp(true)}>
            <HelpCircle size={18} /> Guia rápido <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar dark">FI</span>
            <div>
              <b>Flying Imports</b>
              <small>Visão de demonstração</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            Workspace <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <span className="header-status">
            <span className="live-dot" />{" "}
            {connections.authenticated ? "Apresentador" : "Demonstração local"}
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                FLYING IMPORTS /{" "}
                {page === "Dashboard" ? "VISÃO GERAL" : page.toUpperCase()}
              </div>
              <h1>
                {page === "Dashboard" ? "Seu próximo gol começa aqui." : page}
              </h1>
              <p>
                {
                  {
                    Dashboard:
                      "Mais proximidade com seus clientes. Mais clareza para o seu negócio.",
                    Contatos:
                      "Cada contato, uma nova possibilidade de conexão.",
                    Segmentações:
                      "A mensagem certa começa com o público certo.",
                    CRM: "Do primeiro interesse à próxima camisa.",
                    Campanhas:
                      "Conversas que aproximam sua marca de quem torce com você.",
                    Integrações: "Suas ferramentas, conectadas à sua operação.",
                  }[page]
                }
              </p>
            </div>
            {page === "Dashboard" || page === "Campanhas" ? (
              <button className="primary" onClick={() => newCampaign()}>
                <Plus size={18} /> Nova campanha
              </button>
            ) : page === "Contatos" ? (
              <button
                className="primary"
                onClick={() => open("contact", empty)}
              >
                <Plus size={18} /> Adicionar contato
              </button>
            ) : page === "CRM" ? (
              <button
                className="primary"
                onClick={() =>
                  open("opportunity", {
                    title: "",
                    contactId: data.contacts[0]?.id,
                    stage: 0,
                    notes: "",
                  })
                }
              >
                <Plus size={18} /> Nova oportunidade
              </button>
            ) : null}
          </div>
          {page === "Dashboard" && (
            <>
              <div className="section-caption">
                <span>
                  <span className="live-dot" /> O retrato da sua operação
                </span>
                <span>
                  Base demonstrativa · {new Date().toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="metrics">
                {[
                  [
                    "Total de contatos",
                    counts.contacts,
                    Users,
                    "Sua base de relacionamento",
                  ],
                  [
                    "Já compraram",
                    counts.bought,
                    Shirt,
                    "Clientes que vestem a camisa",
                  ],
                  [
                    "Ainda não compraram",
                    counts.contacts - counts.bought,
                    Target,
                    "Oportunidades para se aproximar",
                  ],
                  [
                    "Sem comprar há 90+ dias",
                    counts.inactive,
                    Clock,
                    "Hora de retomar a conversa",
                  ],
                ].map(([label, value, Icon, note]) => (
                  <div className="metric" key={label}>
                    <div>
                      {label}
                      <Icon size={18} />
                    </div>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <PanelTitle
                    title="A torcida da sua base"
                    sub="Interesses por time"
                  />
                  <div className="bars">
                    {TEAMS.map((t, i) => {
                      let n = data.contacts.filter((c) =>
                        c.teams.includes(t),
                      ).length;
                      return (
                        <button
                          key={t}
                          className="bar-row"
                          onClick={() => {
                            go("Contatos");
                            setFilter({ team: t });
                          }}
                        >
                          <span className="team-mark">
                            {t
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 3)}
                          </span>
                          <span className="bar-name">{t}</span>
                          <span className="bar-track">
                            <span
                              style={{
                                width:
                                  (n /
                                    Math.max(
                                      ...TEAMS.map(
                                        (t) =>
                                          data.contacts.filter((c) =>
                                            c.teams.includes(t),
                                          ).length,
                                      ),
                                      1,
                                    )) *
                                    100 +
                                  "%",
                                background: i < 3 ? "#222" : "#a7a7a7",
                              }}
                            />
                          </span>
                          <b>{n}</b>
                        </button>
                      );
                    })}
                  </div>
                  <div className="panel-note">
                    Um contato pode torcer por mais de um time.
                  </div>
                </section>
                <section className="panel">
                  <PanelTitle
                    title="Cada estilo, uma oportunidade"
                    sub="Interesses por tipo de camisa"
                  />
                  <div className="shirt-chart">
                    <div
                      className="donut"
                      style={{ background: donutBackground(data.contacts) }}
                    >
                      <div>
                        <strong>
                          {data.contacts.filter((c) => c.types.length).length}
                        </strong>
                        <small>com interesses</small>
                      </div>
                    </div>
                    <div className="legend">
                      {TYPES.map((t, i) => (
                        <button
                          key={t}
                          onClick={() => {
                            go("Contatos");
                            setFilter({ type: t });
                          }}
                        >
                          <i
                            style={{
                              background: [
                                "#161616",
                                "#696969",
                                "#aaa",
                                "#dedede",
                              ][i],
                            }}
                          />
                          <span>{t}</span>
                          <b>
                            {
                              data.contacts.filter((c) => c.types.includes(t))
                                .length
                            }
                          </b>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="panel-note">
                    Interesses podem se sobrepor.
                  </div>
                  <div className="insight">
                    <Target size={21} />
                    <div>
                      <b>Transforme interesses em conversas</b>
                      <p>
                        Crie um público com quem já gosta do que você vende.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => go("Segmentações")}
                      >
                        Explorar segmentações <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </section>
                <section className="panel">
                  <PanelTitle
                    title="O jogo está em andamento"
                    sub={`${counts.open} oportunidades abertas`}
                    action="Abrir CRM"
                    onClick={() => go("CRM")}
                  />
                  <div className="pipeline">
                    {STAGES.map((s, i) => (
                      <button key={s} onClick={() => go("CRM")}>
                        <div>
                          <span className={"stage-dot s" + i} />
                          {s}
                          <b>
                            {
                              data.opportunities.filter((o) => o.stage === i)
                                .length
                            }
                          </b>
                        </div>
                        <div className="pipeline-track">
                          <span
                            style={{
                              width:
                                (data.opportunities.filter((o) => o.stage === i)
                                  .length /
                                  Math.max(data.opportunities.length, 1)) *
                                  100 +
                                "%",
                            }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <PanelTitle
                    title="Últimas campanhas"
                    sub="Acompanhe cada iniciativa"
                    action="Ver todas"
                    onClick={() => go("Campanhas")}
                  />
                  {data.campaigns.length ? (
                    <div className="recent-list">
                      {data.campaigns
                        .slice(-3)
                        .reverse()
                        .map((c) => (
                          <button key={c.id} onClick={() => open("history", c)}>
                            <span className="square-icon">
                              <Send size={18} />
                            </span>
                            <div>
                              <b>{c.name}</b>
                              <small>
                                {date(c.createdAt)} · {c.total} contatos
                              </small>
                            </div>
                            <span className="badge">{c.status}</span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="campaign-empty">
                      <span className="square-icon">
                        <Send size={23} />
                      </span>
                      <b>Sua próxima conversa começa aqui</b>
                      <p>Escolha um público e prepare a primeira campanha.</p>
                      <button
                        className="secondary"
                        onClick={() => newCampaign()}
                      >
                        Criar campanha <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <div className="campaign-summary">
                    <span>
                      <b>{totalSim}</b> processados em simulação
                    </span>
                    <span>
                      <b>{apiAccepted}</b> aceitos na fila da API
                    </span>
                    <span>
                      <b>{apiFailed}</b> falhas reais
                    </span>
                  </div>
                </section>
              </div>
              <div className="bottom-banner">
                <span className="square-icon">
                  <Users size={22} />
                </span>
                <div>
                  <b>Sua base organizada. Sua próxima venda mais perto.</b>
                  <p>Adicione um contato e comece um relacionamento.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => open("contact", empty)}
                >
                  Adicionar contato <Plus size={16} />
                </button>
              </div>
            </>
          )}
          {page === "Contatos" && (
            <section className="panel">
              <div className="table-toolbar">
                <div className="search">
                  <Search size={18} />
                  <input
                    placeholder="Buscar por nome ou telefone..."
                    value={filter.search || ""}
                    onChange={(e) =>
                      setFilter({ ...filter, search: e.target.value })
                    }
                  />
                </div>
                <span>{list.length} contatos</span>
                <button
                  className="secondary"
                  disabled={!selected.length}
                  onClick={() => newCampaign(selected)}
                >
                  Criar campanha {selected.length ? `(${selected.length})` : ""}
                </button>
              </div>
              <Filters filter={filter} setFilter={setFilter} />
              <ContactTable rows={list} />
            </section>
          )}
          {page === "Segmentações" && (
            <>
              <div className="segment-grid">
                {data.segments.map((s) => (
                  <section className="panel segment" key={s.id}>
                    <SlidersHorizontal size={22} />
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <strong>
                      {
                        data.contacts.filter((c) => matches(c, s.filters))
                          .length
                      }
                      <small> contatos</small>
                    </strong>
                    <div>
                      <button
                        className="secondary"
                        onClick={() => setFilter(s.filters)}
                      >
                        Ver público
                      </button>
                      <button
                        className="icon-button"
                        aria-label={"Criar campanha para " + s.name}
                        onClick={() => {
                          newCampaign();
                          setDraft((d) => ({ ...d, segment: s.id }));
                        }}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                  </section>
                ))}
              </div>
              <section className="panel">
                <PanelTitle
                  title="Monte seu próximo público"
                  sub={`${list.length} contatos correspondem aos filtros`}
                  action="Salvar segmento"
                  onClick={() =>
                    open("segment", {
                      name: "",
                      description: "",
                      filters: filter,
                    })
                  }
                />
                <Filters filter={filter} setFilter={setFilter} />
                <ContactTable rows={list} />
              </section>
            </>
          )}
          {page === "CRM" && (
            <>
              <div className="section-caption">
                <span>
                  {data.opportunities.length} oportunidades · {counts.open}{" "}
                  abertas
                </span>
                <span>Arraste um cartão ou abra para alterar a etapa</span>
              </div>
              <div className="kanban">
                {STAGES.map((s, i) => (
                  <section
                    className="kanban-column"
                    key={s}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/plain");
                      update(
                        "opportunities",
                        data.opportunities.map((o) =>
                          o.id === id
                            ? {
                                ...o,
                                stage: i,
                                updatedAt: new Date().toISOString(),
                              }
                            : o,
                        ),
                      );
                    }}
                  >
                    <h3>
                      <span className={"stage-dot s" + i} />
                      {s}
                      <span>
                        {data.opportunities.filter((o) => o.stage === i).length}
                      </span>
                    </h3>
                    {data.opportunities
                      .filter((o) => o.stage === i)
                      .map((o) => {
                        let c = data.contacts.find((c) => c.id === o.contactId);
                        return (
                          <button
                            className="op-card"
                            key={o.id}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData("text/plain", o.id)
                            }
                            onClick={() => open("opportunity", o)}
                          >
                            <span className="tag">
                              {c?.demo ? "Demonstração" : "Contato de teste"}
                            </span>
                            <h4>{o.title}</h4>
                            <p>{c?.name || "Contato não encontrado"}</p>
                            <div>
                              <span className="avatar">{c?.name[0]}</span>
                              <span>{date(o.updatedAt)}</span>
                              <MoreHorizontal size={16} />
                            </div>
                          </button>
                        );
                      })}
                    <button
                      className="add-card"
                      onClick={() =>
                        open("opportunity", {
                          title: "",
                          contactId: data.contacts[0]?.id,
                          stage: i,
                          notes: "",
                        })
                      }
                    >
                      <Plus size={15} /> Oportunidade
                    </button>
                  </section>
                ))}
              </div>
            </>
          )}
          {page === "Campanhas" && (
            <>
              <div className="notice">
                <AlertCircle size={19} />
                <span>
                  {connections.authenticated &&
                  connections.whatsapp &&
                  connections.storage
                    ? "Modo apresentador. Envios reais restritos aos dois contatos autorizados."
                    : "Modo demonstração. Entre como apresentador e configure as integrações para habilitar testes reais."}
                </span>
              </div>
              <section className="panel">
                <PanelTitle
                  title="Histórico de campanhas"
                  sub="Simulações e rascunhos salvos neste navegador"
                />
                {!data.campaigns.length ? (
                  <Empty text="Ainda não há campanhas. Crie uma campanha para percorrer o fluxo de demonstração." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Campanha</th>
                          <th>Criação</th>
                          <th>Público</th>
                          <th>Processados</th>
                          <th>Pendentes</th>
                          <th>Situação</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.campaigns.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <b>{c.name}</b>
                              <small>
                                {c.real
                                  ? "Teste real autorizado"
                                  : "Simulação · nenhum envio real"}
                              </small>
                            </td>
                            <td>{date(c.createdAt)}</td>
                            <td>{c.total}</td>
                            <td>{c.processed || 0}</td>
                            <td>{c.total - (c.processed || 0)}</td>
                            <td>
                              <span className="badge">
                                {c.real ? "Teste real · " : ""}
                                {c.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => open("history", c)}
                              >
                                Ver detalhes <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
          {page === "Integrações" && (
            <>
              <div className="notice">
                <Plug size={18} />
                <span>
                  {connections.authenticated
                    ? "Acesso do apresentador ativo."
                    : "Conecte as ferramentas no servidor e entre como apresentador para sincronizar e enviar testes."}
                </span>
                {!connections.authenticated && (
                  <button
                    className="secondary"
                    onClick={() => open("login", { password: "" })}
                  >
                    Entrar como apresentador
                  </button>
                )}
              </div>
              <div className="integration-grid">
                {[
                  [
                    "Google Sheets",
                    "Sua base, em uma planilha.",
                    "Importe e sincronize os contatos com revisão de conflitos.",
                    "Planilha e acesso do servidor pendentes.",
                  ],
                  [
                    "WhatsApp · uAzapi",
                    "Aproxime sua marca de cada torcedor.",
                    "Campanhas manuais, com revisão de público e conteúdo.",
                    "Credenciais e processamento persistente pendentes.",
                  ],
                  [
                    "Vercel",
                    "Seu CRM pronto para compartilhar.",
                    "Acesse o ambiente de demonstração por um link.",
                    "Publicação e ambiente do servidor pendentes.",
                  ],
                ].map(([title, sub, description, status]) => (
                  <section className="panel integration" key={title}>
                    <span className="square-icon">
                      <Plug size={24} />
                    </span>
                    <span className="badge warning">
                      {(
                        title === "Google Sheets"
                          ? connections.google
                          : title === "WhatsApp · uAzapi"
                            ? connections.whatsapp
                            : false
                      )
                        ? "Configurado · validar conexão"
                        : "Não conectado"}
                    </span>
                    <h2>{title}</h2>
                    <b>{sub}</b>
                    <p>{description}</p>
                    <div className="integration-status">
                      <AlertCircle size={16} />
                      {status}
                    </div>
                    {title === "Google Sheets" ? (
                      <a
                        className="secondary"
                        href={SHEET_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir planilha demonstrativa <ArrowUpRight size={16} />
                      </a>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => setToast(status)}
                      >
                        Ver configuração <ArrowUpRight size={16} />
                      </button>
                    )}
                  </section>
                ))}
              </div>
              <section className="panel">
                <PanelTitle
                  title="Dados da demonstração"
                  sub="Alterações são preservadas neste navegador. Use Sincronizar após configurar a conta de serviço."
                />
                <div className="integration-actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(
                        new Blob([JSON.stringify(data, null, 2)], {
                          type: "application/json",
                        }),
                      );
                      a.download = "flying-imports-demo.json";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  >
                    <Download size={16} /> Exportar cópia dos dados
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={syncContacts}
                  >
                    <RefreshCw size={16} /> Sincronizar
                  </button>
                  <span className="muted">
                    Última sincronização:{" "}
                    {lastSync
                      ? new Date(lastSync).toLocaleString("pt-BR")
                      : "nunca"}
                  </span>
                </div>
                {conflicts.length > 0 && (
                  <div className="conflicts">
                    <h3>Revisão necessária</h3>
                    {conflicts.map((c, i) => (
                      <div key={i}>
                        <b>{c.name || c.phone || "Linha inválida"}</b>
                        <p>{c.message}</p>
                        {c.local && c.remote && (
                          <>
                            <pre>CRM: {JSON.stringify(c.local, null, 2)}</pre>
                            <pre>
                              Planilha: {JSON.stringify(c.remote, null, 2)}
                            </pre>
                            <button
                              className="secondary"
                              onClick={() => resolveConflict(c, "local")}
                            >
                              Manter CRM
                            </button>{" "}
                            <button
                              className="secondary"
                              onClick={() => resolveConflict(c, "remote")}
                            >
                              Usar planilha
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          <footer>
            <span>
              FLYING IMPORTS <span className="muted">CRM</span>
            </span>
            <span>Feito para conectar quem vive o futebol.</span>
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            className={"modal " + (modal === "campaign" ? "wide" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "contact" ? "Contato" : "Detalhes"}
          >
            <div className="modal-heading">
              <h2>
                {
                  {
                    contact: draft.id
                      ? "Detalhes do contato"
                      : "Adicionar contato",
                    segment: "Salvar segmentação",
                    opportunity: draft.id
                      ? "Editar oportunidade"
                      : "Nova oportunidade",
                    campaign: "Nova campanha",
                    history: "Detalhes da campanha",
                    login: "Acesso do apresentador",
                  }[modal]
                }
              </h2>
              <button
                className="icon-button"
                aria-label="Fechar"
                onClick={close}
              >
                <X size={21} />
              </button>
            </div>
            {error && (
              <div role="alert" className="notice error">
                {error}
              </div>
            )}
            {modal === "login" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await request("login", { password: draft.password });
                    const status = await request("status");
                    setConnections(status);
                    if (status.storage) {
                      const history = await request("campaign-list");
                      setData((d) => ({
                        ...d,
                        campaigns: [
                          ...d.campaigns.filter((c) => !c.real),
                          ...history.campaigns.map((c) => ({
                            ...c,
                            real: true,
                          })),
                        ],
                      }));
                    }
                    close();
                    setToast("Acesso do apresentador ativo.");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field
                  label="Senha do apresentador"
                  type="password"
                  required
                  value={draft.password}
                  onChange={(v) => field("password", v)}
                />
                <p>A senha é definida em PRESENTER_PASSWORD no servidor.</p>
                <div className="modal-actions">
                  <button disabled={busy} className="primary">
                    Entrar
                  </button>
                </div>
              </form>
            )}
            {modal === "contact" && (
              <form onSubmit={saveContact}>
                <div className="form-grid">
                  <Field
                    label="Nome"
                    required
                    value={draft.name}
                    onChange={(v) => field("name", v)}
                  />
                  <Field
                    label="Telefone com DDD"
                    required
                    value={draft.phone}
                    onChange={(v) => field("phone", v)}
                  />
                  <Field
                    label="Cidade"
                    value={draft.city}
                    onChange={(v) => field("city", v)}
                  />
                  <Field
                    label="Estado (UF)"
                    value={draft.state}
                    onChange={(v) => field("state", v.toUpperCase())}
                  />
                  <label>
                    Origem
                    <Select
                      value={draft.origin}
                      values={["Instagram", "WhatsApp", "Loja física"]}
                      onChange={(v) => field("origin", v)}
                    />
                  </label>
                  <label>
                    Tamanho
                    <Select
                      label="Não informado"
                      value={draft.size}
                      values={["P", "M", "G", "GG", "XG"]}
                      onChange={(v) => field("size", v)}
                    />
                  </label>
                </div>
                <Choice
                  label="Times de interesse"
                  options={TEAMS}
                  value={draft.teams}
                  onChange={(v) => field("teams", v)}
                />
                <Choice
                  label="Tipos de camisa"
                  options={TYPES}
                  value={draft.types}
                  onChange={(v) => field("types", v)}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.bought}
                    onChange={(e) => field("bought", e.target.checked)}
                  />{" "}
                  Já comprou
                </label>
                {draft.bought && (
                  <Field
                    label="Última compra"
                    type="date"
                    value={draft.lastPurchase}
                    onChange={(v) => field("lastPurchase", v)}
                  />
                )}
                <label>
                  Observações
                  <textarea
                    value={draft.notes}
                    onChange={(e) => field("notes", e.target.value)}
                  />
                </label>
                {draft.id && (
                  <div className="related">
                    <b>Oportunidades relacionadas</b>
                    {data.opportunities
                      .filter((o) => o.contactId === draft.id)
                      .map((o) => (
                        <button
                          type="button"
                          className="text-button"
                          key={o.id}
                          onClick={() => open("opportunity", o)}
                        >
                          {o.title} · {STAGES[o.stage]}{" "}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    {!data.opportunities.some(
                      (o) => o.contactId === draft.id,
                    ) && <p>Nenhuma oportunidade para este contato.</p>}
                  </div>
                )}
                <div className="modal-actions">
                  <span className="muted">
                    {draft.demo
                      ? "Contato demonstrativo · envio real bloqueado"
                      : "Autorizado para teste"}
                  </span>
                  <button className="primary">Salvar contato</button>
                </div>
              </form>
            )}
            {modal === "segment" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update("segments", [
                    ...data.segments,
                    { ...draft, id: crypto.randomUUID() },
                  ]);
                  close();
                  setToast("Segmento salvo e disponível para campanhas.");
                }}
              >
                <Field
                  label="Nome do segmento"
                  required
                  value={draft.name}
                  onChange={(v) => field("name", v)}
                />
                <Field
                  label="Descrição"
                  value={draft.description}
                  onChange={(v) => field("description", v)}
                />
                <div className="notice">
                  {list.length} contatos correspondem aos filtros atuais. O
                  público é recalculado com as alterações da base.
                </div>
                <div className="modal-actions">
                  <button className="primary">Salvar segmento</button>
                </div>
              </form>
            )}
            {modal === "opportunity" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  let o = {
                    ...draft,
                    id: draft.id || crypto.randomUUID(),
                    updatedAt: new Date().toISOString(),
                  };
                  update(
                    "opportunities",
                    draft.id
                      ? data.opportunities.map((x) =>
                          x.id === draft.id ? o : x,
                        )
                      : [...data.opportunities, o],
                  );
                  close();
                  setToast("Oportunidade salva.");
                }}
              >
                <Field
                  label="Produto ou interesse"
                  required
                  value={draft.title}
                  onChange={(v) => field("title", v)}
                />
                <label>
                  Contato
                  <select
                    required
                    value={draft.contactId}
                    onChange={(e) => field("contactId", e.target.value)}
                  >
                    {data.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Etapa
                  <select
                    value={draft.stage}
                    onChange={(e) => field("stage", +e.target.value)}
                  >
                    {STAGES.map((s, i) => (
                      <option key={s} value={i}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Observações
                  <textarea
                    value={draft.notes}
                    onChange={(e) => field("notes", e.target.value)}
                  />
                </label>
                <div className="modal-actions">
                  <button className="primary">Salvar oportunidade</button>
                </div>
              </form>
            )}
            {modal === "campaign" && (
              <>
                <div className="steps">
                  {["Público", "Conteúdo", "Revisão"].map((s, i) => (
                    <span key={s} className={i === step ? "current" : ""}>
                      <i>{i + 1}</i>
                      {s}
                    </span>
                  ))}
                </div>
                {step === 0 && (
                  <>
                    <Field
                      label="Nome da campanha"
                      value={draft.name}
                      onChange={(v) => field("name", v)}
                    />
                    <label>
                      Segmento
                      <select
                        disabled={!!draft.retryOf}
                        value={draft.segment}
                        onChange={(e) => field("segment", e.target.value)}
                      >
                        <option value="">
                          Selecionar contatos individualmente
                        </option>
                        {data.segments.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!draft.segment && (
                      <div className="audience-picker">
                        {data.contacts.map((c) => (
                          <label className="checkbox-label" key={c.id}>
                            <input
                              type="checkbox"
                              disabled={!!draft.retryOf}
                              checked={draft.ids.includes(c.id)}
                              onChange={(e) =>
                                field(
                                  "ids",
                                  e.target.checked
                                    ? [...draft.ids, c.id]
                                    : draft.ids.filter((id) => id !== c.id),
                                )
                              }
                            />
                            <span>
                              {c.name}
                              <small>
                                {c.demo
                                  ? "Fictício · excluído de envios reais"
                                  : "Autorizado para teste"}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="notice">
                      {audience(picked).length} contatos únicos selecionados
                    </div>
                  </>
                )}
                {step === 1 && (
                  <div className="compose-grid">
                    <div>
                      <label>
                        Mensagem
                        <textarea
                          rows={6}
                          value={draft.message}
                          onChange={(e) => field("message", e.target.value)}
                        />
                      </label>
                      <small>
                        Use {"{nome}"} para personalizar a mensagem.
                      </small>
                      <label>
                        Mídia opcional
                        <Select
                          label="Somente texto"
                          value={draft.mediaType}
                          values={["Imagem", "Vídeo", "Documento"]}
                          onChange={(v) => field("mediaType", v)}
                        />
                      </label>
                      {draft.mediaType && (
                        <Field
                          label="URL pública da mídia (prévia)"
                          type="url"
                          value={draft.mediaUrl}
                          onChange={(v) => field("mediaUrl", v)}
                        />
                      )}
                      <div className="form-grid">
                        <Field
                          label="Intervalo mínimo (s)"
                          type="number"
                          value={draft.min}
                          onChange={(v) => field("min", v)}
                        />
                        <Field
                          label="Intervalo máximo (s)"
                          type="number"
                          value={draft.max}
                          onChange={(v) => field("max", v)}
                        />
                      </div>
                      <small>
                        Intervalo operacional entre destinatários. Não
                        representa proteção contra bloqueios.
                      </small>
                    </div>
                    <div className="phone-preview">
                      <div>
                        FLYING IMPORTS<small>Prévia da mensagem</small>
                      </div>
                      <div className="message-bubble">
                        {draft.mediaType && (
                          <div className="media-placeholder">
                            {draft.mediaUrl && draft.mediaType === "Imagem" ? (
                              <img
                                src={draft.mediaUrl}
                                alt="Prévia da mídia da campanha"
                              />
                            ) : draft.mediaUrl &&
                              draft.mediaType === "Vídeo" ? (
                              <video src={draft.mediaUrl} controls />
                            ) : draft.mediaUrl ? (
                              <a
                                href={draft.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir documento
                              </a>
                            ) : (
                              `${draft.mediaType} · adicione uma URL`
                            )}
                          </div>
                        )}
                        {draft.message.replaceAll(
                          "{nome}",
                          picked[0]?.name.split(" ")[0] || "Cliente",
                        )}
                        <small>
                          Agora <Check size={13} />
                        </small>
                      </div>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <>
                    <div className="review-summary">
                      <CheckCircle2 size={30} />
                      <h3>Tudo pronto para revisar</h3>
                      <p>Confira o público e a mensagem antes de continuar.</p>
                    </div>
                    <div className="review-stats">
                      <div>
                        <strong>{audience(picked).length}</strong>
                        <small>selecionados</small>
                      </div>
                      <div>
                        <strong>{realAudience(picked).length}</strong>
                        <small>autorizados para teste</small>
                      </div>
                      <div>
                        <strong>
                          {audience(picked).length -
                            realAudience(picked).length}
                        </strong>
                        <small>excluídos do envio real</small>
                      </div>
                    </div>
                    <div className="review-message">
                      <b>{draft.name}</b>
                      <p>
                        {draft.message.replaceAll(
                          "{nome}",
                          picked[0]?.name.split(" ")[0] || "Cliente",
                        )}
                      </p>
                      <small>
                        Intervalo: {draft.min}–{draft.max}s ·{" "}
                        {draft.mediaType || "Somente texto"}
                      </small>
                    </div>
                    <div className="notice">
                      <AlertCircle size={18} />
                      {connections.authenticated &&
                      connections.whatsapp &&
                      connections.storage
                        ? "O teste real enviará apenas aos contatos autorizados. Revise a mensagem antes de confirmar."
                        : "Envio real indisponível. Salve o rascunho ou execute uma simulação local, sem enviar mensagens."}
                    </div>
                  </>
                )}
                <div className="modal-actions">
                  {step > 0 && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setError("");
                        setStep(step - 1);
                      }}
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                  )}
                  {step < 2 ? (
                    <button
                      className="primary"
                      onClick={() => {
                        try {
                          if (
                            step === 0 &&
                            (!draft.name.trim() || !picked.length)
                          )
                            throw Error(
                              "Informe o nome e selecione pelo menos um contato.",
                            );
                          if (step === 1) {
                            validateCampaign(draft);
                            if (
                              draft.mediaType &&
                              !/^https:\/\//.test(draft.mediaUrl)
                            )
                              throw Error(
                                "Informe uma URL HTTPS para a mídia.",
                              );
                          }
                          setError("");
                          setStep(step + 1);
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Continuar <ArrowRight size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary"
                        onClick={() => saveCampaign(false)}
                      >
                        Salvar rascunho
                      </button>
                      {connections.authenticated &&
                        connections.whatsapp &&
                        connections.storage && (
                          <button
                            disabled={
                              busy ||
                              !realAudience(picked).length ||
                              !!draft.mediaType
                            }
                            className="primary"
                            onClick={sendReal}
                          >
                            Confirmar envio real ({realAudience(picked).length})
                          </button>
                        )}
                      <button
                        className="primary"
                        onClick={() => saveCampaign(true)}
                      >
                        Confirmar simulação <Check size={16} />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            {modal === "history" && draft.real ? (
              <>
                <h3>{draft.name}</h3>
                <div className="notice">
                  {draft.error ||
                    "Fila processada pela uAzapi, independente desta aba. Atualize para consultar o resultado."}
                </div>
                <p>Situação: {draft.status}</p>
                <p>
                  {draft.total} destinatários · {draft.apiAccepted ?? 0} aceitos
                  na fila da API
                </p>
                <div className="integration-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => realControl("refresh")}
                  >
                    Atualizar resultado
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || !draft.folderId}
                    onClick={() => realControl("stop")}
                  >
                    Pausar
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || !draft.folderId}
                    onClick={() => realControl("continue")}
                  >
                    Continuar
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || !draft.folderId}
                    onClick={() => realControl("delete")}
                  >
                    Cancelar pendentes
                  </button>
                  <button
                    className="secondary"
                    disabled={
                      busy ||
                      !draft.messages?.some((m) => m.status === "Failed")
                    }
                    onClick={reviewRetry}
                  >
                    Revisar nova tentativa
                  </button>
                </div>
                {draft.messages?.map((m) => (
                  <div className="review-message" key={m.id}>
                    <b>{m.chatid}</b>
                    <p>{m.status}</p>
                    <small>{m.error}</small>
                  </div>
                ))}
              </>
            ) : (
              modal === "history" && (
                <>
                  <span className="badge">{draft.status} · demonstração</span>
                  {draft.status === "Rascunho" && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setStep(0);
                        setModal("campaign");
                      }}
                    >
                      Editar e revisar
                    </button>
                  )}
                  <h3>{draft.name}</h3>
                  <p>{draft.message}</p>
                  <div className="review-stats">
                    <div>
                      <strong>{draft.total}</strong>
                      <small>Destinatários</small>
                    </div>
                    <div>
                      <strong>{draft.processed || 0}</strong>
                      <small>Simulados</small>
                    </div>
                    <div>
                      <strong>0</strong>
                      <small>Aceitos pela API</small>
                    </div>
                  </div>
                  <div className="notice">
                    Nenhuma mensagem foi enviada. Esta simulação não valida
                    conexão, entrega ou leitura.
                  </div>
                  <div className="recipient-history">
                    {draft.recipients?.map((r) => (
                      <div key={r.id}>
                        <span>{r.name}</span>
                        <span className="badge">
                          {draft.processed ? "Simulado" : "Pendente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </section>
        </div>
      )}
      {help && (
        <div className="overlay">
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <h2>Seu roteiro de demonstração</h2>
              <button
                className="icon-button"
                onClick={() => setHelp(false)}
                aria-label="Fechar guia"
              >
                <X />
              </button>
            </div>
            <ol className="guide">
              <li>Conheça a base no Dashboard.</li>
              <li>Em Segmentações, filtre um time ou tipo de camisa.</li>
              <li>
                Crie uma campanha, personalize a mensagem e revise o público.
              </li>
              <li>
                Confirme a simulação. Envios reais dependem da integração.
              </li>
              <li>No CRM, arraste uma oportunidade para outra etapa.</li>
              <li>
                Edite um contato. As mudanças ficam salvas neste navegador.
              </li>
            </ol>
            <div className="notice">
              Dados fictícios identificados. Integrações externas ainda não
              conectadas.
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
  async function syncContacts() {
    setBusy(true);
    setConflicts([]);
    try {
      const result = await request("sheet-sync", {
        contacts: data.contacts,
        base: syncBase,
      });
      update("contacts", result.contacts);
      setSyncBase(result.contacts);
      setLastSync(result.syncedAt);
      localStorage.setItem("flying-sync-base", JSON.stringify(result.contacts));
      localStorage.setItem("flying-last-sync", result.syncedAt);
      setToast("Contatos sincronizados com o Google Sheets.");
    } catch (e) {
      setConflicts(e.conflicts || []);
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  function resolveConflict(c, choice) {
    const value =
      choice === "local" ? c.local : { ...c.remote, id: c.local.id };
    update(
      "contacts",
      data.contacts.map((x) => (x.phone === c.phone ? value : x)),
    );
    const base = [...syncBase.filter((x) => x.phone !== c.phone), c.remote];
    setSyncBase(base);
    localStorage.setItem("flying-sync-base", JSON.stringify(base));
    setConflicts(conflicts.filter((x) => x !== c));
    setToast("Decisão registrada. Clique em Sincronizar para aplicar.");
  }
  async function sendReal() {
    setBusy(true);
    try {
      const pending = {
        ...draft,
        real: true,
        status: "Confirmando envio",
        total: realAudience(picked).length,
        createdAt: new Date().toISOString(),
      };
      update("campaigns", [
        ...data.campaigns.filter((x) => x.id !== pending.id),
        pending,
      ]);
      const result = await request(
        draft.retryOf ? "campaign-retry" : "campaign-start",
        { ...draft, recipients: picked },
      );
      const c = { ...result, real: true };
      update("campaigns", [...data.campaigns.filter((x) => x.id !== c.id), c]);
      open("history", c);
      setPage("Campanhas");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reviewRetry() {
    setBusy(true);
    try {
      const result = await request("retry-review", { id: draft.id });
      if (!result.recipients.length)
        throw Error("Nenhuma falha confirmada para reenviar.");
      const ids = data.contacts
        .filter((c) => result.recipients.some((r) => r.phone === c.phone))
        .map((c) => c.id);
      setStep(0);
      open("campaign", {
        ...result.campaign,
        id: crypto.randomUUID(),
        name: result.campaign.name + " · nova tentativa",
        retryOf: result.campaign.id,
        segment: "",
        ids,
        mediaType: "",
        mediaUrl: "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function realControl(command) {
    setBusy(true);
    try {
      if (command !== "refresh")
        await request("campaign-control", { id: draft.id, command });
      const result = await request("campaign-status", { id: draft.id });
      const c = { ...result, real: true };
      setDraft(c);
      update(
        "campaigns",
        data.campaigns.map((x) => (x.id === c.id ? c : x)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function saveCampaign(sim) {
    let c = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      total: audience(picked).length,
      processed: sim ? audience(picked).length : 0,
      status: sim ? "Simulação concluída" : "Rascunho",
      recipients: audience(picked).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
      })),
    };
    update("campaigns", [...data.campaigns.filter((x) => x.id !== c.id), c]);
    close();
    setPage("Campanhas");
    setToast(
      sim
        ? "Simulação concluída. Nenhuma mensagem foi enviada."
        : "Rascunho salvo.",
    );
  }
}
function Filters({ filter, setFilter }) {
  return (
    <div className="filters">
      <Select
        label="Time"
        value={filter.team}
        values={TEAMS}
        onChange={(v) => setFilter({ ...filter, team: v })}
      />
      <Select
        label="Tipo de camisa"
        value={filter.type}
        values={TYPES}
        onChange={(v) => setFilter({ ...filter, type: v })}
      />
      <Select
        label="Tamanho"
        value={filter.size}
        values={["P", "M", "G", "GG", "XG"]}
        onChange={(v) => setFilter({ ...filter, size: v })}
      />
      <select
        aria-label="Histórico de compra"
        value={filter.bought || ""}
        onChange={(e) => setFilter({ ...filter, bought: e.target.value })}
      >
        <option value="">Histórico de compra</option>
        <option value="yes">Já compraram</option>
        <option value="no">Ainda não compraram</option>
        <option value="inactive">Sem comprar há 90+ dias</option>
      </select>
      <Select
        label="Origem"
        value={filter.origin}
        values={["Instagram", "WhatsApp", "Loja física"]}
        onChange={(v) => setFilter({ ...filter, origin: v })}
      />
      <input
        placeholder="Cidade"
        value={filter.city || ""}
        onChange={(e) => setFilter({ ...filter, city: e.target.value })}
      />
      <input
        placeholder="UF"
        maxLength={2}
        value={filter.state || ""}
        onChange={(e) => setFilter({ ...filter, state: e.target.value })}
      />
      <label>
        Última compra, de
        <input
          type="date"
          value={filter.from || ""}
          onChange={(e) => setFilter({ ...filter, from: e.target.value })}
        />
      </label>
      <label>
        até
        <input
          type="date"
          value={filter.to || ""}
          onChange={(e) => setFilter({ ...filter, to: e.target.value })}
        />
      </label>
      <button className="text-button" onClick={() => setFilter({})}>
        Limpar
      </button>
    </div>
  );
}

function normalizeSafe(p) {
  try {
    return normalizePhone(p);
  } catch {
    return p;
  }
}
function Select({ label, value, values, onChange }) {
  return (
    <select
      aria-label={label}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {label && <option value="">{label}</option>}
      {values.map((v) => (
        <option key={v}>{v}</option>
      ))}
    </select>
  );
}
function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      {label}
      <input
        type={type}
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Choice({ label, options, value = [], onChange }) {
  return (
    <div className="choice">
      <label>{label}</label>
      <div>
        {options.map((v) => (
          <button
            type="button"
            key={v}
            className={value.includes(v) ? "chosen" : ""}
            onClick={() =>
              onChange(
                value.includes(v)
                  ? value.filter((x) => x !== v)
                  : [...value, v],
              )
            }
          >
            {value.includes(v) && <Check size={13} />} {v}
          </button>
        ))}
      </div>
    </div>
  );
}
function PanelTitle({ title, sub, action, onClick }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="empty">
      <Users size={28} />
      <p>{text}</p>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
