console.log("Current URL from content.js:", window.location.href);


createLogInButton(); // Call the renamed function to add the button
addLoginButton();             // add log in button
showButtonOnTextSelection();

manageButtonForConversation();
getHrefsFromContainer();










async function pushDataToFirebase(useremail, merged_data) {
	let dataToPush  = await merged_data; // Merge with existing data and update to server

	 // Validate dataToPush
	if (!dataToPush || Object.keys(dataToPush).length === 0) {
        console.error("No valid data to push:", dataToPush);
        return;
    }

    const jsonBody = JSON.stringify(dataToPush);

    fetch(`http://localhost:8080/api/push_data_to_firebase?email=${encodeURIComponent(useremail)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Ensure this is correct
        },
        body: jsonBody
    })
    .then(response => {
        console.log("Server response status:", response.status); // Debug status
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => console.log("Data pushed to Firebase:", data))
    .catch(error => console.error("Error pushing to Firebase:", error));

} 
function updateChatHistoryToFirebaseServer(usermail) {
    const chatHistory = getHrefsFromContainer(); // Get current hrefs and titles
    const historyData = { chatHistory }; // Prepare data structure

	pushDataToFirebase(usermail, mergeData(historyData));

}
async function mergeData(newData) {
    if (newData === null || newData === undefined) {
          console.error("Invalid newData: null or undefined");
          throw new Error("newData must be provided");
    }
    if (typeof newData !== 'object' || Array.isArray(newData)) {
          console.error("Invalid newData type:", typeof newData);
          throw new Error("newData must be an object");
    }

    try {
        // Retrieve stored data with a timeout wrapper
        const storedData = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout: Failed to retrieve data from chrome.storage.sync"));
            }, 5000); // 5-second timeout

            chrome.storage.sync.get(null, (data) => {
                clearTimeout(timeout); // Clear timeout on success
                if (chrome.runtime.lastError) {
                    console.error("Error retrieving data:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(data || {}); // Default to empty object if no data
            });
        });

        // Validate storedData (should be an object)
        if (typeof storedData !== 'object' || storedData === null || Array.isArray(storedData)) {
            console.warn("Stored data is invalid, resetting to empty object:", storedData);
            storedData = {};
        }

        // Merge data
        const updatedData = {
            ...storedData,
            ...newData
        };

        // Ensure updatedData is not empty or malformed
        if (Object.keys(updatedData).length === 0 && Object.keys(newData).length > 0) {
            console.warn("Merge resulted in empty data despite newData:", newData);
        }

        return updatedData; // Return the actual merged object
    } catch (error) {
        console.error("Merge failed:", error.message || error);
        throw error; // Re-throw for caller to handle
    }
}
function showButtonOnTextSelection() {
    let selectionButton = null;
    let currentSelectedText = "";

    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      // Update stored text only if there's a valid selection
      if (selectedText) {
        currentSelectedText = selectedText;
      }

      // Remove existing button if no text is selected
      if (!selectedText && selectionButton) {
        selectionButton.remove();
        selectionButton = null;
        return;
      }

      // If text is selected, create or update the button
      if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (!selectionButton) {
          selectionButton = document.createElement("button");
          selectionButton.classList.add("selection-btn");
          selectionButton.style.position = "absolute";
          selectionButton.style.width = "24px";
          selectionButton.style.height = "24px";
          selectionButton.style.backgroundColor = "#555";
          selectionButton.style.border = "1px solid #999";
          selectionButton.style.borderRadius = "4px";
          selectionButton.style.display = "flex";
          selectionButton.style.alignItems = "center";
          selectionButton.style.justifyContent = "center";
          selectionButton.style.color = "#ddd";
          selectionButton.style.cursor = "pointer";
          selectionButton.innerHTML = "★";
          selectionButton.setAttribute("aria-label", "Insert selected text");

          // Insert selected text into the text field in quotes, fully visible
          selectionButton.addEventListener("click", () => {
            const targetField = document.querySelector("#prompt-textarea > p");
            if (targetField) {
              const quotedText = `Referencing the following in quotation-->"${currentSelectedText}" `; // Full text in quotes
              targetField.textContent = quotedText; // Insert fully visible
              targetField.focus(); // Optional: Focus the field
              console.log("Text inserted into #prompt-textarea > p (in quotes):", quotedText);
            } else {
              console.log("Target field (#prompt-textarea > p) not found!");
            }
          });

          document.body.appendChild(selectionButton);
        }

        // Position the button above the selection
        selectionButton.style.top = `${rect.top + window.scrollY - 30}px`;
        selectionButton.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 12}px`;
        selectionButton.style.zIndex = "1000";
      }
});

  // Remove button when clicking elsewhere
document.addEventListener("click", (e) => {
    if (selectionButton && e.target !== selectionButton) {
        const selection = window.getSelection();
        if (selection.toString().trim() === "") {
            selectionButton.remove();
            selectionButton = null;
        }
    }
  });
}
function manageButtonForConversation() {
    function findContainer() {
        return document.querySelector(
            "body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div.z-\\[21\\].flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary.max-md\\:\\!w-0 > div > div > div > nav > div.flex-col.flex-1.transition-opacity.duration-500.relative.pr-3.overflow-y-auto > div > div.flex.flex-col.gap-2.text-token-text-primary.text-sm.mt-5.first\\:mt-0.false"
        );
    }

    function log(message) {
        console.log(`[Content] ${message}`);
    }

    function startWatching() {
        const container = findContainer();
        if (!container) {
            log("Container not found, retrying...");
            setTimeout(startWatching, 1000); // Retry every 1 second indefinitely
            return;
        }

        log("Container found");
        updateButtons(container); // Initial setup
    }

    function updateButtons(container) {
        const buttons = container.querySelectorAll("button:not(.custom-square-btn)");
        log(`Found ${buttons.length} original buttons`);

        buttons.forEach(addCustomButton);

        // Continuously watch for new buttons
        const observer = new MutationObserver(() => {
            const currentButtons = container.querySelectorAll("button:not(.custom-square-btn)");
            log(`DOM changed, found ${currentButtons.length} original buttons`);
            currentButtons.forEach(addCustomButton);
        });
        observer.observe(container, { childList: true, subtree: true });
    }

    function addCustomButton(button, index) {
        if (!button.nextElementSibling || !button.nextElementSibling.classList.contains("custom-square-btn")) {
            const newButton = document.createElement("button");
            newButton.classList.add("custom-square-btn");
            newButton.innerHTML = "□";
            newButton.setAttribute("aria-label", "Show random overlay");

            // Add a unique identifier (e.g., index-based)
            const buttonId = `custom-btn-${index}`;
            newButton.setAttribute("data-button-id", buttonId);

            // Store original button details for context
            const originalDetails = getButtonDetails(button, index);
            newButton.setAttribute("data-original-text", originalDetails.text);
            newButton.setAttribute("data-original-aria", originalDetails.ariaLabel);

            newButton.addEventListener("click", () => {
                console.log("Button pressed:", {
                    id: buttonId,
                    originalText: originalDetails.text,
                    originalAriaLabel: originalDetails.ariaLabel,
                    index: index
                });
                manageChatManagementOverlay("show"); // Assuming this exists
            });

            button.parentNode.insertBefore(newButton, button.nextSibling);
        }
    }

    function getButtonDetails(button, index) {
        return {
            index: index + 1,
            text: button.textContent.trim() || "[No text]",
            ariaLabel: button.getAttribute("aria-label") || "[No aria-label]",
            id: button.id || "[No ID]",
            classes: button.className || "[No classes]"
        };
    }

    startWatching();
}




function manageChatManagementOverlay(action) {
    const randomMessages = [
      "Hello World!",
      "Random Click!",
      "Surprise!",
      "Overlay Time!",
      "Click Me Again!"
    ];
  
    let overlay = document.getElementById("custom-overlay");
  
    if (action === "show") {
      if (!overlay) {
        // Create overlay
        overlay = document.createElement("div");
        overlay.id = "custom-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "transparent";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "1000";
  
        // Create message box
        const messageBox = document.createElement("div");
        messageBox.style.backgroundColor = "#333";
        messageBox.style.color = "#ddd";
        messageBox.style.padding = "40px";
        messageBox.style.borderRadius = "8px";
        messageBox.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.3)";
        messageBox.style.fontSize = "32px";
        messageBox.style.textAlign = "center";
        messageBox.style.position = "relative"; // For positioning close button
  
        // Add random message
        const messageText = document.createElement("p");
        messageText.id = "overlay-message";
        messageText.style.margin = "0 0 20px 0"; // Space below message
        messageBox.appendChild(messageText);
  
        // Add close button (top-right)
        const closeButton = document.createElement("button");
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.width = "24px";
        closeButton.style.height = "24px";
        closeButton.style.backgroundColor = "transparent";
        closeButton.style.border = "none";
        closeButton.style.color = "#ddd";
        closeButton.style.cursor = "pointer";
        closeButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        closeButton.setAttribute("aria-label", "Close overlay");
        closeButton.addEventListener("click", () => {
          overlay.style.display = "none";
        });
        messageBox.appendChild(closeButton);
  
        // Add OK button (bottom-right)
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.style.position = "absolute";
        okButton.style.bottom = "10px";
        okButton.style.right = "10px";
        okButton.style.padding = "10px 20px";
        okButton.style.backgroundColor = "#555";
        okButton.style.color = "#ddd";
        okButton.style.border = "none";
        okButton.style.borderRadius = "4px";
        okButton.style.cursor = "pointer";
        okButton.addEventListener("click", () => {
          overlay.style.display = "none";
        });
        messageBox.appendChild(okButton);
  
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
      }
  
      // Show overlay with random message
      const randomMsg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      overlay.querySelector("#overlay-message").textContent = randomMsg;
      overlay.style.display = "flex";
    }
}
function getHrefsFromContainer() {
    const results = [];
    function startWatching() {
      const container = document.querySelector(
        "body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div.z-\\[21\\].flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary.max-md\\:\\!w-0 > div"
      );
      if (!container) {
        console.log("Container not found, retrying...");
        setTimeout(startWatching, 1000); // Retry every 1s
        return;
      }
  
      function updateHrefs() {
        results.length = 0; // Clear previous results
        const linkElements = container.querySelectorAll("a[href]");
        linkElements.forEach((link) => {
          const href = link.getAttribute("href");
          if (href && href.startsWith("/c")) {
            const fullHref = `https://chatgpt.com${href}`; // Prepend the base URL
            const title = link.getAttribute("title") || link.textContent.trim() || "";
            results.push({ href: fullHref, title });
          }
        });
        console.log("Found hrefs and titles :", results);
      }
  
      updateHrefs();
      const observer = new MutationObserver(() => {
        updateHrefs();
      });
      observer.observe(container, { childList: true, subtree: true });
    }
  
    startWatching();
    return results;
}
function pullDataFromChromeStorage() {
    chrome.storage.sync.get(null, (stored_data) => {
        if (stored_data.hasOwnProperty('useremail')) {
            updateButtonText(stored_data['useremail']);
        } else {
            console.log("No existing user found. Will change the button to log in");
            updateButtonText('login');
        }
    });
}
async function checkAuthStatus(email) {
    try {
        const response = await fetch(`http://localhost:8080/api/get_auth_status?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        if (data.authenticated == true){
            console.log('content.js log in successful', data.authenticated);
            mergeSyncAndUpdateChromeStorage(email, null);
        }

    } catch (error) {
        console.error('Error syncing data:', error);
        throw error;
    }
}
function mergeSyncAndUpdateChromeStorage(useremail, existingData) {
    pullDataFromFirebaseServer(useremail)
        .then(userData => {
            const updatedData = {
                ...existingData,
                ...userData
            };
            
            chrome.storage.sync.set(updatedData, () => {
                if (chrome.runtime.lastError) {
                    console.error("content.js Error saving data:", chrome.runtime.lastError);
                } else {
                    console.log("Data saved successfully from content.js:", updatedData);
                }
            });
        })
        .catch(error => {
            console.error('Failed to sync:', error);
        });
}
async function pullDataFromFirebaseServer(email) {
    try {
        const response = await fetch(`http://localhost:8080/api/sync_data?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
		return data;
    } catch (error) {
        console.error('Error syncing data:', error);
        throw error;
    }
}













function createLogInButton() {
    const button = document.createElement('button');
    button.textContent = 'log in'; // Initial button text
    button.id = 'LOGINBUTTON'; // ID used for reference
    return button;
}
function addLoginButton() {
    document.body.appendChild(createLogInButton());
	console.log("login button added");
}
function updateButtonText(newText) {
    const button = document.getElementById('my-custom-button');
    if (button) {
        button.textContent = newText; // Update button text
    }
}



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "createLoginButton") {
        addLoginButton(); // Call the renamed function to add the button
    }

    if (request.action === "pullDataFromChromeStorage") {
        pullDataFromChromeStorage();
    }

    if (request.action === "updateChatHistoryToFirebaseServer") {
		let usermail = request.data;
        updateChatHistoryToFirebaseServer(usermail);
    }
});

document.getElementById("LOGINBUTTON").addEventListener("click", () => {
    console.log("Opening login popup from contentjs");
    chrome.runtime.sendMessage({ action: "openpopup" });
});