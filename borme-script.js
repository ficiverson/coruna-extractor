(() => {
  const BORME_API_URL = "https://www.boe.es/datosabiertos/api/borme/sumario/";
  const DEFAULT_DATE = "20251114";
  const CORS_PROXY = "https://corsproxy.io/?";

  const fetchBormePayload = async (formattedDate = DEFAULT_DATE) => {
    const targetUrl = `${BORME_API_URL}${formattedDate || DEFAULT_DATE}`;
    const requestUrl = CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl;
    console.log(`[network:BORME] Fetching ${requestUrl}`);

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`BORME request failed with ${response.status}`);
    }

    const payloadText = await response.text();
    try {
      const payload = JSON.parse(payloadText);
      console.log("[parse:BORME] Parsed JSON payload");
      return payload;
    } catch (error) {
      throw new Error("BORME response is not valid JSON");
    }
  };

  window.corunaSources = window.corunaSources || {};
  window.corunaSources.fetchBormePayload = fetchBormePayload;
})();

