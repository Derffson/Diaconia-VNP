const API_URL = "https://sheetdb.io/api/v1/8pz0n20zol1uh";
const API_AVISOS = "https://sheetdb.io/api/v1/8pz0n20zol1uh?sheet=avisos";

document.getElementById("escalaForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const form = e.target;

  const novaEscala = {
    data: form.dataEscala.value,
    vocal: form.vocal.value.trim(),
  };

  if (!novaEscala.data) {
    alert("Informe a data da escala.");
    return;
  }

  try {
    // Apaga escala da data antes para não duplicar
    await fetch(`${API_URL}/data/data/${encodeURIComponent(novaEscala.data)}`, {
      method: "DELETE",
    });

    // Salva nova escala
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ data: [novaEscala] }),
      headers: { "Content-Type": "application/json" },
    });

    alert("Escala salva com sucesso!");
    form.reset();
    atualizarCalendario();
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
    // Busca avisos antigos e deleta todos para manter só o último
    const res = await fetch(API_AVISOS);
    const anteriores = await res.json();

    for (const a of anteriores) {
      await fetch(`${API_AVISOS}/data/aviso/${encodeURIComponent(a.aviso)}`, {
        method: "DELETE",
      });
    }

    // Salva novo aviso com data
    await fetch(API_AVISOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ aviso, data: dataAviso }] }),
    });

    alert("Aviso salvo!");
    e.target.reset();
    carregarAviso();
    atualizarCalendario();
  } catch (error) {
    alert("Erro ao salvar aviso.");
    console.error(error);
  }
});

async function carregarAviso() {
  try {
    const res = await fetch(API_AVISOS);
    const avisos = await res.json();
    if (!avisos.length) {
      document.getElementById("avisoDisplayTexto").textContent = "Nenhum aviso cadastrado.";
      return;
    }
    // Último aviso cadastrado
    const ultimo = avisos[avisos.length - 1];
    document.getElementById("avisoDisplayTexto").textContent = ultimo.aviso;
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
  <p> <strong>Equipe Diaconia:</strong> ${dados.vocal || ''}</p>
  <p> <strong>Abertura:</strong> ${dados.abertura || ''}</p>
  <p> <strong>Oferta:</strong> ${dados.oferta || ''}</p>
  <p> <strong>Palavra:</strong> ${dados.palavra || ''}</p>

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
    atualizarCalendario();
    alert("Escala excluída com sucesso!");
  } catch (error) {
    console.error(error);
    alert("Erro ao excluir a escala.");
  }
}

let calendar;

document.addEventListener("DOMContentLoaded", () => {
  iniciarCalendario();
  carregarAviso();
});

async function iniciarCalendario() {
  const calendarEl = document.getElementById("calendario");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    events: await gerarEventos(),
    eventClick: function (info) {
  const data = info.event.startStr;

  if (info.event.title.includes("Aviso")) {
    carregarAvisoPorData(data);
  } else {
    mostrarEscala(data);
  }

  document.getElementById("dataBusca").value = data;
},

async function carregarAvisoPorData(data) {
  try {
    const res = await fetch(API_AVISOS);
    const avisos = await res.json();
    const avisoDoDia = avisos.find(a => a.data === data);

    if (avisoDoDia) {
      document.getElementById("avisoDisplayTexto").textContent = avisoDoDia.aviso;
    } else {
      document.getElementById("avisoDisplayTexto").textContent = "Nenhum aviso para essa data.";
    }
  } catch (error) {
    console.error("Erro ao carregar aviso:", error);
    document.getElementById("avisoDisplayTexto").textContent = "Erro ao carregar aviso.";
  }
}

async function gerarEventos() {
  const resEscalas = await fetch(API_URL);
  const escalas = await resEscalas.json();

  const resAvisos = await fetch(API_AVISOS);
  const avisos = await resAvisos.json();

  const eventosEscalas = escalas
    .filter(e => e.data)
    .map(e => ({
      title: "Escala",
      start: e.data,
      backgroundColor: "#3a87ad",
      borderColor: "#3a87ad",
    }));

  const eventosAvisos = avisos
  .filter(a => a.data)
  .map(a => ({
    title: "📢 Aviso",
    start: a.data,
    backgroundColor: "#FFA500",
    borderColor: "#FF8C00",
    classNames: ["evento-aviso"] // adiciona a classe para estilizar no CSS
  }));

  return [...eventosEscalas, ...eventosAvisos];
}

function atualizarCalendario() {
  if (!calendar) return;
  calendar.removeAllEvents();
  gerarEventos().then((eventos) => {
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
  } else {
    alert("Senha incorreta.");
  }
}
