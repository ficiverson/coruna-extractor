const STATUS_CLASSES = ["loading", "success", "error"];
const API_URL = "https://www.boe.es/datosabiertos/api/boe/sumario/";
const ORIGINS = {
  BOE: "BOE",
  BORME: "BORME",
};

const CORS_PROXY = "https://corsproxy.io/?";

const datePicker = document.querySelector("#datePicker");
const saveButton = document.querySelector("#saveButton");
const status = document.querySelector("#status");
const searchCard = document.querySelector("#searchCard");
const resultsContainer = document.querySelector("#resultsContainer");

const clearStatus = () => {
  STATUS_CLASSES.forEach((cls) => status.classList.remove(cls));
  status.textContent = "";
};

const setStatus = (text, type) => {
  clearStatus();
  if (type) status.classList.add(type);
  status.textContent = text;
  console.log(`[status] ${text}`);
};

const searchForCoruna = (data, searchTerm = "Coruña") => {
  const results = [];
  const searchLower = searchTerm.toLowerCase();
  
  const searchInObject = (obj, path = "") => {
    if (typeof obj === "string") {
      if (obj.toLowerCase().includes(searchLower)) {
        return true;
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => searchInObject(item, `${path}[${index}]`));
    } else if (obj && typeof obj === "object") {
      return Object.entries(obj).some(([key, value]) => {
        if (typeof value === "string" && value.toLowerCase().includes(searchLower)) {
          return true;
        }
        return searchInObject(value, path ? `${path}.${key}` : key);
      });
    }
    return false;
  };
  
  const extractItems = (obj, path = "") => {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (searchInObject(item)) {
          results.push({ ...item, _path: `${path}[${index}]` });
        }
        extractItems(item, `${path}[${index}]`);
      });
    } else if (obj && typeof obj === "object") {
      Object.entries(obj).forEach(([key, value]) => {
        if (key.toLowerCase().includes("item") || key.toLowerCase().includes("documento") || key.toLowerCase().includes("sumario")) {
          extractItems(value, path ? `${path}.${key}` : key);
        } else {
          extractItems(value, path ? `${path}.${key}` : key);
        }
      });
    }
  };
  
  extractItems(data);
  return results;
};

const pickFirstValue = (item, keys) => {
  if (!item) return undefined;
  for (const key of keys) {
    if (key in item && item[key] != null && item[key] !== "") {
      return item[key];
    }
  }
  return undefined;
};

const normalizeUrlField = (value) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return (
      value.url ||
      value.href ||
      value.link ||
      value.texto ||
      value.text ||
      value["#text"]
    );
  }
  return undefined;
};

const normalizePdfField = (value) => {
  if (!value) return undefined;
  if (typeof value === "string") {
    return { texto: value };
  }

  const attributes = value["@attributes"] || value.atributos || {};
  const pdf = {
    ...attributes,
    szBytes: value.szBytes || attributes.szBytes,
    szKBytes: value.szKBytes || attributes.szKBytes,
    pagina_inicial: value.pagina_inicial || attributes.pagina_inicial,
    pagina_final: value.pagina_final || attributes.pagina_final,
    texto:
      value.texto ||
      value.url ||
      value.href ||
      value.link ||
      value["#text"] ||
      value.__text ||
      attributes.texto,
  };

  Object.keys(pdf).forEach((key) => {
    if (pdf[key] == null || pdf[key] === "") {
      delete pdf[key];
    }
  });

  return Object.keys(pdf).length ? pdf : undefined;
};

const normalizeItem = (item, origin) => {
  if (!item || typeof item !== "object") return undefined;
  const identificador = pickFirstValue(item, [
    "identificador",
    "id",
    "identidad",
    "codigo",
    "codigoCompleto",
  ]);
  const normalized = {
    identificador,
    control: pickFirstValue(item, [
      "control",
      "numControl",
      "num_control",
      "numero_control",
      "numeroControl",
    ]),
    titulo: pickFirstValue(item, [
      "titulo",
      "title",
      "nombre",
      "descripcion",
      "texto",
    ]),
    url_pdf: normalizePdfField(item.url_pdf || item.pdf || item.urlPdf),
    url_html: normalizeUrlField(item.url_html || item.url || item.enlace),
    url_xml: normalizeUrlField(item.url_xml || item.xml),
  };

  if (!normalized.titulo && normalized.identificador) {
    normalized.titulo = normalized.identificador;
  }

  if (!normalized.titulo) return undefined;

  normalized.origin = origin || ORIGINS.BOE;

  normalized.origin = origin || ORIGINS.BOE;

  return normalized;
};

const isValidNormalizedItem = (item) => {
  if (!item) return false;
  const hasIdentifier = typeof item.identificador === "string" && item.identificador.length > 0;
  const hasTitle = typeof item.titulo === "string" && item.titulo.length > 0;
  const hasPdf =
    item.url_pdf && typeof item.url_pdf.texto === "string" && item.url_pdf.texto.startsWith("http");
  return hasIdentifier && hasTitle && hasPdf;
};

const createResultCard = (item, index) => {
  const card = document.createElement("article");
  card.className = "result-card";

  const title = item.titulo || `Item ${index + 1}`;
  const originClass = (item.origin || "unknown").toLowerCase();

  const headerButton = document.createElement("button");
  headerButton.className = "result-header";
  headerButton.type = "button";
  headerButton.setAttribute("aria-expanded", "false");
  headerButton.innerHTML = `
    <div class="result-header-text">
      <div class="result-header-top">
        <span class="result-origin result-origin-${originClass}">${item.origin || "Unknown"}</span>
        <h3>${title}</h3>
      </div>
    </div>
    <span class="result-chevron" aria-hidden="true">⌄</span>
  `;

  const details = document.createElement("div");
  details.className = "result-details";
  details.hidden = true;

  const body = document.createElement("div");
  body.className = "result-body";

  const linksWrapper = document.createElement("div");
  linksWrapper.className = "result-links";

  if (item.identificador) {
    const identifier = document.createElement("p");
    identifier.className = "result-meta";
    identifier.textContent = `Identificador: ${item.identificador}`;
    body.appendChild(identifier);
  }

  if (item.control) {
    const control = document.createElement("p");
    control.className = "result-meta";
    control.textContent = `Control: ${item.control}`;
    body.appendChild(control);
  }

  if (item.url_html) {
    const link = document.createElement("a");
    link.href = item.url_html;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "result-link";
    link.textContent = "Open HTML";
    linksWrapper.appendChild(link);
  }

  if (item.url_pdf?.texto) {
    const link = document.createElement("a");
    link.href = item.url_pdf.texto;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "result-link";
    const sizeInfo =
      item.url_pdf.szKBytes || item.url_pdf.szBytes
        ? ` (${item.url_pdf.szKBytes || `${Math.round((Number(item.url_pdf.szBytes) || 0) / 1024)} KB`})`
        : "";
    link.textContent = `Download PDF${sizeInfo}`;
    linksWrapper.appendChild(link);
  }

  if (item.url_xml) {
    const link = document.createElement("a");
    link.href = item.url_xml;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "result-link";
    link.textContent = "View XML";
    linksWrapper.appendChild(link);
  }

  if (linksWrapper.childElementCount > 0) {
    body.appendChild(linksWrapper);
  }

  const prettyJson = document.createElement("pre");
  prettyJson.className = "result-json";
  prettyJson.textContent = JSON.stringify(item, null, 2);
  body.appendChild(prettyJson);

  details.appendChild(body);

  headerButton.addEventListener("click", () => {
    const expanded = headerButton.getAttribute("aria-expanded") === "true";
    headerButton.setAttribute("aria-expanded", String(!expanded));
    details.hidden = expanded;
    card.classList.toggle("expanded", !expanded);
  });

  card.appendChild(headerButton);
  card.appendChild(details);

  return card;
};

const setTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  datePicker.value = `${year}-${month}-${day}`;
};

const resetToInitialState = () => {
  resultsContainer.innerHTML = "";
  resultsContainer.classList.add("hidden");
  searchCard.classList.remove("hidden");
  setTodayDate();
  clearStatus();
};

const displayResults = (items) => {
  resultsContainer.innerHTML = "";
  
  if (items.length === 0) {
    const noResultsCard = document.createElement("div");
    noResultsCard.className = "card no-results";
    noResultsCard.innerHTML = `
      <h2>No results found</h2>
      <p>No items containing "Coruña" were found for this date.</p>
      <button type="button" class="back-button" aria-label="Go back to search">
        <span aria-hidden="true">←</span> Back to Search
      </button>
    `;
    noResultsCard.querySelector(".back-button").addEventListener("click", resetToInitialState);
    resultsContainer.appendChild(noResultsCard);
  } else {
    const header = document.createElement("div");
    header.className = "results-header";
    
    const headerContent = document.createElement("div");
    headerContent.className = "results-header-content";
    
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "back-button";
    backButton.setAttribute("aria-label", "Go back to search");
    backButton.innerHTML = `<span aria-hidden="true">←</span> Back`;
    backButton.addEventListener("click", resetToInitialState);
    
    const title = document.createElement("h2");
    title.textContent = `Found ${items.length} item${items.length !== 1 ? "s" : ""} containing "Coruña"`;
    
    headerContent.appendChild(backButton);
    headerContent.appendChild(title);
    header.appendChild(headerContent);
    resultsContainer.appendChild(header);

    items.forEach((item, index) => {
      const card = createResultCard(item, index);
      resultsContainer.appendChild(card);
    });
  }
  
  searchCard.classList.add("hidden");
  resultsContainer.classList.remove("hidden");
};

const processPayload = (payload, origin) => {
  if (!payload) return [];
  const corunaItems = searchForCoruna(payload);
  console.log(`[filter:${origin}] Found ${corunaItems.length} raw matches containing "Coruña"`);
  const normalizedItems = corunaItems
    .map((item) => normalizeItem(item, origin))
    .filter(isValidNormalizedItem);
  console.log(`[transform:${origin}] ${normalizedItems.length} items normalized`);
  return normalizedItems;
};

const fetchBoePayload = async (formattedDate) => {
  const targetUrl = `${API_URL}${formattedDate}`;
  const requestUrl = CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl;
  console.log(`[network:BOE] Fetching ${requestUrl}`);

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`BOE request failed with ${response.status}`);
  }

  const payloadText = await response.text();
  try {
    const payload = JSON.parse(payloadText);
    console.log("[parse:BOE] Parsed JSON payload");
    return payload;
  } catch (error) {
    throw new Error("BOE response is not valid JSON");
  }
};

const formatDateForApi = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const onSaveClick = async () => {
  console.log("[action] Save button clicked");
  const value = datePicker.value;
  if (!value) {
    console.log("[validation] No date selected");
    setStatus("Please pick a date first.", "error");
    return;
  }

  saveButton.classList.add("hidden");
  console.log(`[operation] Preparing request for ${value}`);
  const hasBormeFetcher = Boolean(window.corunaSources?.fetchBormePayload);
  setStatus(`Searching ${hasBormeFetcher ? "BOE + BORME" : "BOE"}...`, "loading");

  const formattedDate = formatDateForApi(value);

  const tasks = [
    fetchBoePayload(formattedDate).then((payload) => processPayload(payload, ORIGINS.BOE)),
  ];

  if (hasBormeFetcher) {
    tasks.push(
      window.corunaSources.fetchBormePayload(formattedDate).then((payload) => processPayload(payload, ORIGINS.BORME))
    );
  }

  const settledResults = await Promise.allSettled(tasks);

  const aggregated = [];
  const errors = [];

  settledResults.forEach((result, index) => {
    const source = index === 0 ? ORIGINS.BOE : ORIGINS.BORME;
    if (result.status === "fulfilled") {
      aggregated.push(...result.value);
    } else {
      console.error(`[network:${source}]`, result.reason);
      errors.push(`${source}: ${result.reason?.message || result.reason}`);
    }
  });

  if (aggregated.length === 0) {
    const errorText =
      errors.length > 0
        ? `No results. ${errors.join(" | ")}`
        : "No Coruña entries found for this date.";
    setStatus(errorText, "error");
  } else {
    const summary = `Found ${aggregated.length} Coruña entr${aggregated.length === 1 ? "y" : "ies"}.`;
    if (errors.length) {
      setStatus(`${summary} Some sources failed: ${errors.join(" | ")}`, "error");
    } else {
      setStatus(summary, "success");
    }
  }

  displayResults(aggregated);

  saveButton.classList.remove("hidden");
  console.log("[operation] Button shown again");
};

saveButton.addEventListener("click", onSaveClick);

// Set today's date as default
setTodayDate();

