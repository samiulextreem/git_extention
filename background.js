// This file can be used for background tasks if needed.
// Currently, it can remain empty if no background functionality is required. 
let popupWindowId = null; // Variable to store the popup window ID
clearExtentionstorage();


// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openpopup") {
        createPopupWindow();
    }

    if (request.action === "updateTasksToDoAfterLogin") {
        
        let email = request.data;
        updateUserFunctionality(email);
        console.log('welcome back, ', email);
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


function clearExtentionstorage() {
    console.log('clearing storage from background');
    chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing storage:", chrome.runtime.lastError);
        } else {
            console.log("Sync storage cleared!");
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




chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.storage.local.get(["hasSeenWelcome"], (result) => {
            if (!result.hasSeenWelcome) {
                chrome.tabs.create({ url: "welcome.html" });
                chrome.storage.local.set({ "hasSeenWelcome": true });
            }
        });
    }
});


function updateUserFunctionality(data) {
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            console.log("Checking tabs for matches...");
            tabs.forEach((tab, index) => {
                const tabUrl = tab.url || "No URL (e.g., chrome:// page)";
                // console.log(`Tab ID: ${tab.id}, URL: ${tabUrl}`);

                if (tabUrl.includes("chatgpt.com")) {
                    //only update the log in button with user name
                    chrome.tabs.sendMessage(tab.id, { action: "updateloginevent", data: data });
                }
            });
        } else {
            console.log("No tabs found.");
        }
    });
}


// In your extension's background script or service worker
function checkPaymentStatus() {
    // Only check sync storage for user email
    chrome.storage.sync.get('useremail', function(result) {
        const userEmail = result.useremail;
        
        if (userEmail) {
            console.log('Checking payment status for:', userEmail);
            verifyPayment(userEmail);
        } else {
            // Not found in sync storage
            console.log('No email found in sync storage, user not logged in');
            chrome.storage.local.set({isPremium: false}, function() {
                console.log('Premium status set to false (no user)');
            });
        }
    });
}


