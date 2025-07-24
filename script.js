const API_URL = "https://sheetdb.io/api/v1/3dm1n48bg6bnk";
const API_AVISOS = "https://sheetdb.io/api/v1/3dm1n48bg6bnk?sheet=avisos";

let calendar;
let escalasCache = [];
let avisosCache = [];

document.addEventListener("DOMContentLoaded", () => {
  iniciarCalendario();
  carregarAviso(); // Sem parâmetro -> usa cache depois
  preencherFiltro();
  document.getElementById("filtroDiaconos").addEventListener("change", atualizarCalendario);
});

document.getElementById("escalaForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const form = e.target;

  const novaEscala = {
    data: form.dataEscala.value,
    vocal: form.vocal.value.trim(),
    abertura: form.abertura.value.trim(),
    oferta: form.oferta.value.trim(),
    palavra: form.palavra.value.trim(),
  };

  if (!novaEscala.data) {
    alert("Informe a data da escala.");
    return;
  }

  try {
    await fetch(`${API_URL}/data/data/${encodeURIComponent(novaEscala.data)}`, {
      method: "DELETE",
    });

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ data: [novaEscala] }),
      headers: { "Content-Type": "application/json" },
    });

    alert("Escala salva com sucesso!");
    form.reset();
    escalasCache = []; // limpa cache para recarregar
    atualizarCalendario();
    preencherFiltro();
  } catch (error) {
    alert("Erro ao salvar escala.");
    console.error(error);
  }
});

document.getElementById("formAviso").addEventListener("submit", async function (e) {
  e.preventDefault();
  const aviso = document.getElementById("avisoTexto").value.trim();
  const dataAviso = document.getElementById("dataAviso").value;

  if (!aviso || !dataAviso) {
    alert("Preencha o aviso e selecione a data.");
    return;
  }

  try {
    // Apaga só aviso com data igual
    await fetch(`${API_AVISOS}/data/data/${encodeURIComponent(dataAviso)}`, {
      method: "DELETE",
    });

    await fetch(API_AVISOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ aviso, data: dataAviso }] }),
    });

    alert("Aviso salvo!");
    e.target.reset();
    avisosCache = []; // limpa cache para forçar recarregar
    carregarAviso();
    atualizarCalendario();
  } catch (error) {
    alert("Erro ao salvar aviso.");
    console.error(error);
  }
});

async function carregarAviso(avisos) {
  try {
    if (!avisos) {
      if (!avisosCache.length) {
        const res = await fetch(API_AVISOS);
        avisosCache = await res.json();
      }
      avisos = avisosCache;
    }

    if (!avisos.length) {
      document.getElementById("avisoDisplayTexto").textContent = "Nenhum aviso cadastrado.";
      return;
    }

    const ultimo = avisos[avisos.length - 1];
    document.getElementById("avisoDisplayTexto").innerHTML = (ultimo.aviso || "").replace(/\n/g, "<br>");
  } catch (error) {
    console.error("Erro ao carregar aviso:", error);
    document.getElementById("avisoDisplayTexto").textContent = "Erro ao carregar aviso.";
  }
}

async function buscarEscala() {
  const data = document.getElementById("dataBusca").value;
  if (!data) {
    alert("Selecione uma data para buscar.");
    return;
  }
  mostrarEscala(data);
}

async function mostrarEscala(data) {
  const container = document.getElementById("escalaSalva");

  try {
    const res = await fetch(`${API_URL}/search?data=${encodeURIComponent(data)}`);
    const escalas = await res.json();
    const dados = escalas[0];

    if (!dados) {
      container.innerHTML = `<p><strong>Nenhuma escala cadastrada para ${data}.</strong></p>`;
      return;
    }

    const isAdmin = document.getElementById("areaAdmin").style.display === "block";

    container.innerHTML = `
      <h2>Escala da Semana (${data})</h2>
      <p><strong>Equipe Diaconia:</strong> ${dados.vocal || ''}</p>
      <p><strong>Abertura:</strong> ${dados.abertura || ''}</p>
      <p><strong>Oferta:</strong> ${dados.oferta || ''}</p>
      <p><strong>Palavra:</strong> ${dados.palavra || ''}</p>
      ${isAdmin ? `
        <button onclick="editarEscala('${data}')">Editar</button>
        <button class="botao-secundario" onclick="excluirEscala('${data}')">Excluir</button>
      ` : ''}
    `;
  } catch (error) {
    console.error("Erro ao buscar escala:", error);
    container.innerHTML = "<p>Erro ao carregar escala.</p>";
  }
}

async function editarEscala(data) {
  const res = await fetch(`${API_URL}/search?data=${encodeURIComponent(data)}`);
  const dados = (await res.json())[0];
  if (!dados) return alert("Escala não encontrada.");

  const form = document.getElementById("escalaForm");
  form.dataEscala.value = data;
  form.vocal.value = dados.vocal || '';
  form.abertura.value = dados.abertura || '';
  form.oferta.value = dados.oferta || '';
  form.palavra.value = dados.palavra || '';

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirEscala(data) {
  if (!confirm(`Tem certeza que deseja excluir a escala do dia ${data}?`)) return;

  try {
    const res = await fetch(`${API_URL}/data/data/${encodeURIComponent(data)}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Falha ao excluir escala");

    document.getElementById("escalaSalva").innerHTML = "";
    escalasCache = [];
    atualizarCalendario();
    preencherFiltro();
    alert("Escala excluída com sucesso!");
  } catch (error) {
    console.error(error);
    alert("Erro ao excluir a escala.");
  }
}

async function iniciarCalendario() {
  const calendarEl = document.getElementById("calendario");

  const { eventos, avisos } = await gerarEventos();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    events: eventos,
    eventClick: function (info) {
      const data = info.event.startStr;

      if (info.event.classNames.includes("evento-aviso")) {
        carregarAvisoPorData(data, avisos);
      } else {
        mostrarEscala(data);
      }

      document.getElementById("dataBusca").value = data;
    },
  });

  calendar.render();
}

async function gerarEventos() {
  if (!escalasCache.length) {
    const resEscalas = await fetch(API_URL);
    escalasCache = await resEscalas.json();
  }

  if (!avisosCache.length) {
    const resAvisos = await fetch(API_AVISOS);
    avisosCache = await resAvisos.json();
  }

  const filtroSelecionado = document.getElementById("filtroDiaconos").value;

  const eventosEscalas = escalasCache
    .filter(e => e.data)
    .filter(e => filtroSelecionado === "todos" || (e.vocal && e.vocal.toLowerCase() === filtroSelecionado.toLowerCase()))
    .map(e => ({
      title: "Escala",
      start: e.data,
      backgroundColor: "#3a87ad",
      borderColor: "#3a87ad",
      extendedProps: { vocal: e.vocal }
    }));

  const eventosAvisos = avisosCache
    .filter(a => a.data)
    .map(a => ({
      title: "📢",
      start: a.data,
      backgroundColor: "#FFA500",
      borderColor: "#FF8C00",
      classNames: ["evento-aviso"]
    }));

  return { eventos: [...eventosEscalas, ...eventosAvisos], avisos: avisosCache };
}

function atualizarCalendario() {
  if (!calendar) return;
  calendar.removeAllEvents();
  escalasCache = [];
  avisosCache = [];
  gerarEventos().then(({ eventos, avisos }) => {
    calendar.addEventSource(eventos);
    calendar.refetchEvents();
  });
}

function ativarModoAdmin() {
  const senha = prompt("Digite a senha de administrador:");
  if (senha === "diac2025") {
    document.getElementById("areaAdmin").style.display = "block";
    document.getElementById("btnAdmin").style.display = "none";
    atualizarCalendario();
    preencherFiltro();
  } else {
    alert("Senha incorreta.");
  }
}

async function carregarAvisoPorData(data, avisos) {
  try {
    if (!avisos) {
      if (!avisosCache.length) {
        const res = await fetch(API_AVISOS);
        avisosCache = await res.json();
      }
      avisos = avisosCache;
    }

    const avisoDoDia = avisos.find(a => a.data === data);

    if (avisoDoDia) {
      document.getElementById("avisoDisplayTexto").innerHTML = (avisoDoDia.aviso || "").replace(/\n/g, "<br>");
    } else {
      document.getElementById("avisoDisplayTexto").textContent = "Nenhum aviso para essa data.";
    }
  } catch (error) {
    console.error("Erro ao carregar aviso:", error);
    document.getElementById("avisoDisplayTexto").textContent = "Erro ao carregar aviso.";
  }
}

async function preencherFiltro() {
  try {
    const res = await fetch(API_URL);
    const escalas = await res.json();

    const nomesUnicos = [...new Set(escalas
      .map(e => e.vocal)
      .filter(vocal => vocal && vocal.trim().length > 0)
      .map(vocal => vocal.trim())
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const filtro = document.getElementById("filtroDiaconos");
    filtro.options.length = 1;

    nomesUnicos.forEach(nome => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      filtro.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao preencher filtro:", error);
  }
}
