// This file can be used for background tasks if needed.
// Currently, it can remain empty if no background functionality is required. 
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});


//Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openPopup") {
        chrome.action.openPopup();
    }
});

