document.addEventListener('DOMContentLoaded', () => {
    let contentConnected = null; // null = unknown, true/false after ping

    function sendMessagePromise(tabId, message) {
        try {
            // MV3 supports promise-based APIs. Using the promise form ensures we can always catch
            // "Receiving end does not exist" without relying on callback semantics that vary by Chrome version.
            return Promise.resolve(chrome.tabs.sendMessage(tabId, message));
        } catch (e) {
            return Promise.reject(e);
        }
    }

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
        sendMessagePromise(tabId, { action: "ping" })
            .then((response) => {
                contentConnected = !!response?.ok;
                const isActive = document.getElementById('toggleProtection')?.checked ?? true;
                updateUI(isActive, contentConnected, response?.hasComposer);
            })
            .catch(() => {
                // No receiver / unsupported page / content script not injected
                contentConnected = false;
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
            if(tabs[0]) sendMessagePromise(tabs[0].id, { action: "toggle_protection", state: newState }).catch(() => {});
        });
    });

    // Clear history handler
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if(tabs[0]) sendMessagePromise(tabs[0].id, { action: "clear_mapping" }).catch(() => {});
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

    // Footer links
    document.getElementById('privacyLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
    });
    document.getElementById('termsLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('terms.html') });
    });
    document.getElementById('faqLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL('faq.html') });
    });
    document.getElementById('upgradeLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://safeprompt.ai/upgrade' });
    });
});

function updateUI(active, contentConnected, hasComposer = null) {
    const badge = document.getElementById('statusBadge');
    if (contentConnected === false) {
        badge.innerText = "No Access";
        badge.style.background = "#fee2e2";
        badge.style.color = "#991b1b";
        return;
    }
    if (contentConnected === true && hasComposer === false) {
        badge.innerText = "No Controls";
        badge.style.background = "#fef3c7";
        badge.style.color = "#92400e";
        return;
    }
    if (active) {
        badge.innerText = "Active"; badge.style.background = "#d1fae5"; badge.style.color = "#065f46";
    } else {
        badge.innerText = "Paused"; badge.style.background = "#fee2e2"; badge.style.color = "#991b1b";
    }
}
