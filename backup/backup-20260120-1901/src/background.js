// MV3 service worker: provides tab context to content scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.action === 'get_tab_id') {
    sendResponse({ tabId: sender?.tab?.id ?? null });
    return; // sync response
  }
});

