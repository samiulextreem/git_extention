// This file can be used for background tasks if needed.
// Currently, it can remain empty if no background functionality is required. 
let popupWindowId = null; // Variable to store the popup window ID
// clearExtentionstorage();
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});


// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openpopup") {
        // chrome.windows.create({ url: "https://youtube.com" });
        createPopupWindow();
    }

    
    if (request.action === "updateTasksToDoAfterLogin") {
        let email =  request.data;
        console.log('will update everything after login ');
        updateContentAndCreateButton();
        updateUserFunctionality(email);
                
    }

});




// Helper function to create the popup window
function createPopupWindow() {
    chrome.windows.create({
        url: chrome.runtime.getURL("login_popup.html"),
        type: "panel",
        width: 400,
        height: 600
    }, (window) => {
        popupWindowId = window.id;
    });
}



function clearExtentionstorage(){
    console.log('clearing storage from background');
    chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing storage:", chrome.runtime.lastError);
        } else {
            console.log("Sync storage cleared!");
        }
    });
    
}



function updateContentAndCreateButton() {
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            console.log("Checking tabs for matches...");
            tabs.forEach((tab, index) => {
                const tabUrl = tab.url || "No URL (e.g., chrome:// page)";
                console.log(`Tab ID: ${tab.id}, URL: ${tabUrl}`);

                if (tabUrl.includes("chatgpt.com")) {
                    //only update the log in button with user name
                    chrome.tabs.sendMessage(tab.id, { action: "pullDataFromChromeStorage" });
                }
            });
        } else {
            console.log("No tabs found.");
        }
    });
}



function updateUserFunctionality(email) {
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            console.log("Checking tabs for matches...");
            tabs.forEach((tab, index) => {
                const tabUrl = tab.url || "No URL (e.g., chrome:// page)";
                // console.log(`Tab ID: ${tab.id}, URL: ${tabUrl}`);

                if (tabUrl.includes("chatgpt.com")) {
                    //only update the log in button with user name
                    chrome.tabs.sendMessage(tab.id, { action: "updateChatHistoryToFirebaseServer", data: email });
                }
            });
        } else {
            console.log("No tabs found.");
        }
    });
}
  

  



  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download") {
      chrome.downloads.download({
        url: message.url,
        filename: message.filename,
        saveAs: true // Prompts the user to choose location
      });
    }
  });



  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
      console.log("Received capture request from content script");
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Capture error:", chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (!dataUrl) {
          console.error("Capture failed: No image data returned");
          sendResponse({ error: "No image data" });
        } else {
          console.log("Capture successful, sending data URL");
          sendResponse({ dataUrl: dataUrl });
        }
      });
      return true; // Keep the message port open
    }
  });