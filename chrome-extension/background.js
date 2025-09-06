chrome.webNavigation.onCompleted.addListener((details) => {
  // Filter out non-main frame navigations (e.g. iframes)
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => {
      if (tab && tab.url) {
        fetch("http://127.0.0.1:8000/api/add-website?" + new URLSearchParams({
            url: tab.url,
        }).toString(),
        {
          method: "POST",
        }).catch(err => console.error("Failed to send URL:", err));
      }
    });
  }
});
