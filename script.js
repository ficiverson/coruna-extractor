const STATUS_CLASSES = ["loading", "success", "error"];
const API_URL = "https://www.boe.es/datosabiertos/api/boe/sumario/";

const datePicker = document.querySelector("#datePicker");
const saveButton = document.querySelector("#saveButton");
const status = document.querySelector("#status");

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  setStatus("Saving date...", "loading");

  await delay(3000);
  console.log("[operation] Fake delay complete");

  const formattedDate = formatDateForApi(value);
  const requestUrl = `${API_URL}${formattedDate}`;
  console.log(`[network] Fetching ${requestUrl}`);

  try {
    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    const payload = await response.text();
    console.log("[network] Response payload:", payload);

    const date = new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

    setStatus(`Stored ${date}.`, "success");
  } catch (error) {
    console.error("[network] Error fetching summary", error);
    setStatus("Unable to store date. Please try again.", "error");
  } finally {
    saveButton.classList.remove("hidden");
    console.log("[operation] Button shown again");
  }
};

saveButton.addEventListener("click", onSaveClick);

