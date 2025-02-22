// This file can be used for background tasks if needed.
// Currently, it can remain empty if no background functionality is required. 
let popupWindowId = null; // Variable to store the popup window ID

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openpopup") {
        // chrome.windows.create({ url: "https://youtube.com" });
        createPopupWindow();
        }
    }
);


// Helper function to create the popup window
function createPopupWindow() {
    chrome.windows.create({
        url: chrome.runtime.getURL("login_popup.html"),
        type: "popup",
        width: 400,
        height: 600
    }, (window) => {
        popupWindowId = window.id;
    });
}

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_SUCCESS') {
      chrome.action.openPopup && chrome.action.openPopup();
    }
  });


