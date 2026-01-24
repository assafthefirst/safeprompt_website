document.addEventListener('DOMContentLoaded', () => {
    let contentConnected = null; // null = unknown, true/false after ping

    // Load initial state
    chrome.storage.local.get(['protectionActive', 'protectedCount'], (result) => {
        const isActive = result.protectionActive !== false; 
        document.getElementById('toggleProtection').checked = isActive;
        updateUI(isActive, contentConnected);
        document.getElementById('itemsProtected').innerText = result.protectedCount || 0;
    });

    // Check if content script is connected on the active tab (helps debug "buttons not showing")
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tabId = tabs?.[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
            if (chrome.runtime.lastError) {
                contentConnected = false;
            } else {
                contentConnected = !!response?.ok;
            }
            const isActive = document.getElementById('toggleProtection')?.checked ?? true;
            updateUI(isActive, contentConnected);
        });
    });

    // Toggle protection handler
    document.getElementById('toggleProtection').addEventListener('change', (e) => {
        const newState = e.target.checked;
        chrome.storage.local.set({ protectionActive: newState });
        updateUI(newState, contentConnected);
        
        // Send message to active tab
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_protection", state: newState });
        });
    });

    // Clear history handler
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "clear_mapping" });
        });
        document.getElementById('itemsProtected').innerText = "0";
        chrome.storage.local.set({ protectedCount: 0 });
    });

    // Report issue handler (opens internal report page)
    document.getElementById('reportIssueBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const url = chrome.runtime.getURL('report.html');
        chrome.tabs.create({ url });
    });
});

function updateUI(active, contentConnected) {
    const badge = document.getElementById('statusBadge');
    if (contentConnected === false) {
        badge.innerText = "No Access";
        badge.style.background = "#fee2e2";
        badge.style.color = "#991b1b";
        return;
    }
    if (active) {
        badge.innerText = "Active"; badge.style.background = "#d1fae5"; badge.style.color = "#065f46";
    } else {
        badge.innerText = "Paused"; badge.style.background = "#fee2e2"; badge.style.color = "#991b1b";
    }
}
