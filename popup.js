document.addEventListener("DOMContentLoaded", () => {
    const extensionToggle = document.getElementById("extension-toggle");
    const statusLabel = document.getElementById("status-label");
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
  
    // Handle toggle
    extensionToggle.addEventListener("change", () => {
      const isEnabled = extensionToggle.checked;
      statusLabel.textContent = isEnabled ? "Enabled" : "Disabled";
      statusLabel.style.color = isEnabled ? "#00ffcc" : "#ff0000";
      chrome.runtime.sendMessage({ action: isEnabled ? "enable" : "disable" });
    });
  
    // Handle slider
    slider.addEventListener("input", () => {
      const transparency = slider.value;
      sliderValue.textContent = `Transparency: ${transparency}%`;
      document.querySelector(".popup-container").style.opacity = transparency / 100;
    });
  
    // Save settings
    const saveButton = document.getElementById("save-settings");
    saveButton.addEventListener("click", () => {
      const bigPreviews = document.getElementById("big-previews").checked;
      const hideBar = document.getElementById("hide-bar").checked;
      const fixLayout = document.getElementById("fix-layout").checked;
      const transparency = slider.value;
  
      chrome.storage.local.set({ bigPreviews, hideBar, fixLayout, transparency });
      alert("Settings Saved!");
    });
  
    // Load settings
    chrome.storage.local.get(["bigPreviews", "hideBar", "fixLayout", "transparency"], (data) => {
      document.getElementById("big-previews").checked = data.bigPreviews || false;
      document.getElementById("hide-bar").checked = data.hideBar || false;
      document.getElementById("fix-layout").checked = data.fixLayout || false;
  
      if (data.transparency) {
        slider.value = data.transparency;
        sliderValue.textContent = `Transparency: ${data.transparency}%`;
        document.querySelector(".popup-container").style.opacity = data.transparency / 100;
      }
    });
  });
  