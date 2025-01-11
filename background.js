const BUFF_COOKIE =
  "Device-Id=V8AG2psJNkKRq6UnPiPF; Locale-Supported=en; game=csgo; session=1-P72t1ARS68TObP8mNAISg39IxMD1teYIjwD29Ap0bUPQ2041730748; client_id=dQUdXrUZ4CcC6dHues7g7Q; display_appids_v2=\"[730\\054 570]\"; csrf_token=ImE1NWRiYWMwMWY3MGJlMDgxNmZmYmViMDI0NzgxZTQ3ZDkwMjAwODUi.Z3oRVQ.jyzdRCIgYctCZEmWPbzma7u7ohw";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Buff163 Price Fetching
  if (message.action === "fetchBuffPrice") {
    const marketHashName = message.marketHashName.trim();
    const encodedMarketHashName = encodeURIComponent(marketHashName)
      .replace(/%7C/g, "|")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29");

    const requestUrl = `http://localhost:5000/fetch_price?market_hash_name=${encodedMarketHashName}`;

    fetch(requestUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          console.error("Buff163 API returned an error:", data.error);
          sendResponse({ price: "Error" });
        } else if (!data.price) {
          console.error("No price found in Buff163 response:", data);
          sendResponse({ price: "Error: No price available" });
        } else {
          sendResponse({
            price: data.price.replace("¥", ""), // Remove ¥ symbol
          });
        }
      })
      .catch((error) => {
        console.error("Buff163 Fetch failed:", error);
        sendResponse({ price: "Error: Fetch failed" });
      });

    return true; // Keep the message channel open for async response
  }

  // CSFloat Price Fetching
  if (message.action === "fetchCSFloatPrice") {
    const marketHashName = message.marketHashName.trim();
    const encodedMarketHashName = encodeURIComponent(marketHashName);

    const requestUrl = `http://localhost:5001/fetch_csfloat_price?market_hash_name=${encodedMarketHashName}`;

    fetch(requestUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          console.error("CSFloat API returned an error:", data.error);
          sendResponse({ price: "Error" });
        } else if (!data.price) {
          console.error("No price found in CSFloat response:", data);
          sendResponse({ price: "Error: No price available" });
        } else {
          sendResponse({
            price: data.price, // Price already in USD
          });
        }
      })
      .catch((error) => {
        console.error("CSFloat Fetch failed:", error);
        sendResponse({ price: "Error: Fetch failed" });
      });

    return true; // Keep the message channel open for async response
  }
});
