const processedNames = new Set(); // Track processed market_hash_names
const priceCache = new Map(); // Cache for storing fetched prices

// Load cached prices from localStorage
function loadCache() {
  const storedCache = JSON.parse(localStorage.getItem("priceCache"));
  if (storedCache) {
    for (const [key, value] of Object.entries(storedCache)) {
      priceCache.set(key, value);
    }
  }
}

// Save cached prices to localStorage
function saveCache() {
  const cacheObject = Object.fromEntries(priceCache.entries());
  localStorage.setItem("priceCache", JSON.stringify(cacheObject));
}

// Clean and transform market_hash_name
function cleanMarketHashName(itemType, itemName, itemQuality) {
  let marketHashName = `${itemType} | ${itemName} (${itemQuality})`.trim();

  const ignorePatterns = [
    "- Sapphire",
    "- Emerald",
    "- Ruby",
    "- Black Pearl",
    "- Phase 1",
    "- Phase 2",
    "- Phase 3",
    "- Phase 4",
  ];

  ignorePatterns.forEach((pattern) => {
    const regex = new RegExp(`\\s*${pattern}`, "gi");
    marketHashName = marketHashName.replace(regex, "");
  });

  if (itemType.includes("★")) {
    marketHashName = marketHashName.replace(" - ", " | ");
  }

  return marketHashName.trim();
}

// Fetch Buff163 price from the background script
async function fetchBuffPrice(marketHashName) {
  if (priceCache.has(`${marketHashName}-buff`)) {
    return priceCache.get(`${marketHashName}-buff`);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "fetchBuffPrice", marketHashName },
      (response) => {
        const data = response || { price: "Error" };
        priceCache.set(`${marketHashName}-buff`, data);
        saveCache();
        resolve(data);
      }
    );
  });
}

// Fetch CSFloat price from the background script
async function fetchCSFloatPrice(marketHashName) {
  if (priceCache.has(`${marketHashName}-csfloat`)) {
    return priceCache.get(`${marketHashName}-csfloat`);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "fetchCSFloatPrice", marketHashName },
      (response) => {
        const data = response || { price: "Error" };
        priceCache.set(`${marketHashName}-csfloat`, data);
        saveCache();
        resolve(data);
      }
    );
  });
}

// Calculate percentage difference
function calculatePercentageDifference(csEmpirePrice, otherPrice) {
  const diff = ((csEmpirePrice - otherPrice) / otherPrice) * 100;
  return diff.toFixed(2);
}

// Create or update the price box
function updatePriceBox(item, csEmpirePriceText, buffData, csFloatData, marketHashName) {
  const buffPriceYuan = parseFloat(buffData.price.replace("¥", ""));
  const buffPriceUsd = buffPriceYuan * 0.14; // Convert Yuan to USD
  const csFloatPriceUsd = parseFloat(csFloatData.price);

  const percentageDifferenceBuff = calculatePercentageDifference(
    parseFloat(csEmpirePriceText.replace(/,/g, "")),
    buffPriceUsd
  );
  const percentageDifferenceCSFloat = calculatePercentageDifference(
    parseFloat(csEmpirePriceText.replace(/,/g, "")),
    csFloatPriceUsd
  );

  let priceBox = item.querySelector(".buff-info-box");
  if (!priceBox) {
    priceBox = document.createElement("div");
    priceBox.className = "buff-info-box";
    item.appendChild(priceBox);
  }

  const priceBoxContent = `
    <div class="price-box">
      <p class="price-header">COMPARISON</p>
      <p>
        <span class="label">CSEmpire Price:</span>
        <span class="value cs-empire-price">${csEmpirePriceText} Coins</span>
      </p>
      <p>
        <span class="label">Buff163 Price (USD):</span>
        <span class="value buff-price-usd">$${buffPriceUsd.toFixed(2)}</span>
      </p>
      <p>
        <span class="label">CSFloat Price (USD):</span>
        <span class="value csfloat-price-usd">$${csFloatPriceUsd.toFixed(2)}</span>
      </p>
      <p class="difference-box ${percentageDifferenceBuff >= 0 ? "positive" : "negative"}">
        Buff Difference: <span class="difference-value">${percentageDifferenceBuff}%</span>
      </p>
      <p class="difference-box ${percentageDifferenceCSFloat >= 0 ? "positive" : "negative"}">
        CSFloat Difference: <span class="difference-value">${percentageDifferenceCSFloat}%</span>
      </p>
    </div>
  `;

  priceBox.innerHTML = priceBoxContent;

  // Return the rendered content for caching
  return priceBoxContent;
}

// Process individual items
async function processItems() {
  const items = document.querySelectorAll('[data-testid="item-card-enabled"]');

  const processedItems = new Map(); // Track processed items to avoid duplicates

  for (const item of items) {
    const itemType = item.querySelector('[data-testid="item-card-item-type"]')?.textContent.trim() || "Unknown Type";
    const itemName = item.querySelector('[data-testid="item-card-item-name"]')?.textContent.trim() || "Unknown Name";
    const itemQuality = item.querySelector('[data-testid="item-card-quality"]')?.textContent.trim() || "Unknown Quality";
    const csEmpirePriceText = item.querySelector('[data-testid="currency-value"] span:last-child')?.textContent.trim();

    const marketHashName = cleanMarketHashName(itemType, itemName, itemQuality);

    // Prevent processing the same item multiple times
    if (processedItems.has(marketHashName)) {
      const cachedContent = processedItems.get(marketHashName);
      if (cachedContent) {
        // Add cached content to duplicate items
        let priceBox = item.querySelector(".buff-info-box");
        if (!priceBox) {
          priceBox = document.createElement("div");
          priceBox.className = "buff-info-box";
          item.appendChild(priceBox);
        }
        priceBox.innerHTML = cachedContent;
      }
      continue;
    }

    // Skip if a price box already exists
    if (item.querySelector(".buff-info-box")) {
      continue;
    }

    // Check for cached data
    if (priceCache.has(marketHashName)) {
      const cachedData = priceCache.get(marketHashName);
      if (cachedData.content) {
        const infoBox = document.createElement("div");
        infoBox.className = "buff-info-box";
        infoBox.innerHTML = cachedData.content;
        item.appendChild(infoBox);
        processedItems.set(marketHashName, cachedData.content);
        continue;
      }
    }

    try {
      // Fetch Buff163 and CSFloat prices in parallel
      const [buffData, csFloatData] = await Promise.all([
        fetchBuffPrice(marketHashName),
        fetchCSFloatPrice(marketHashName),
      ]);

      // Update the item with fetched data
      const priceBoxContent = updatePriceBox(item, csEmpirePriceText, buffData, csFloatData, marketHashName);

      // Cache the rendered content for duplicates
      processedItems.set(marketHashName, priceBoxContent);
    } catch (error) {
      console.error(`Error fetching price for ${marketHashName}:`, error);
    }
  }
}

// Inject styles dynamically into the page
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Add your CSS styles here */
  `;
  document.head.appendChild(style);
}

// Load cache on script initialization
loadCache();

// Observe DOM changes for dynamically loaded or updated items
const observer = new MutationObserver(() => {
  processItems();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial execution and visibility change handling
injectStyles();
processItems();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    processItems();
  }
});
