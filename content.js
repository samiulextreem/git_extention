console.log("Current URL from content.js:", window.location.href);
console.log("content.js loaded");


let currentChat = {
    title: "", // Default empty string
    href: ""   // Default empty string
};
let isSearchVisible = true;
let overlayActvated = false;



createLogInButton(); // Call the renamed function to add the button
addLoginButton();             // add log in button
showButtonOnTextSelection();
manageConversationButtonsAndTitles();




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

function manageConversationButtonsAndTitles() {
    let chatHistory = []; // Store titles and hrefs dynamically
    let activeObserver = null; // Track the current observer

    function findContainer() {
        return document.querySelector(
            "body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div.z-\\[21\\].flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary.max-md\\:\\!w-0 > div > div > div > nav > div.flex-col.flex-1.transition-opacity.duration-500.relative.pr-3.overflow-y-auto > div > div.flex.flex-col.gap-2.text-token-text-primary.text-sm.mt-5.first\\:mt-0.false"
        );
    }

    function log(message) {
        console.log(`[Content] ${message}`);
    }

    function initializeConversation(container) {
        // Update chat history (titles and hrefs)
        updateChatHistory(container);

        // Add custom buttons to all initial buttons
        const buttons = container.querySelectorAll("button:not(.custom-square-btn)");
        buttons.forEach((button, index) => addCustomButton(button, index));

        // Watch for changes within the container
        if (activeObserver) {
            activeObserver.disconnect(); // Disconnect any previous observer
        }
        activeObserver = new MutationObserver(() => {
            updateChatHistory(container); // Refresh chatHistory
            const newButtons = container.querySelectorAll("button:not(.custom-square-btn)");
            newButtons.forEach((button, index) => addCustomButton(button, index));
        });
        activeObserver.observe(container, { childList: true, subtree: true });
    }

    function updateChatHistory(container) {
        chatHistory.length = 0;
        const linkElements = container.querySelectorAll("a[href]");
        linkElements.forEach((link) => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("/c")) {
                const fullHref = `https://chatgpt.com${href}`;
                const title = link.getAttribute("title") || link.textContent.trim() || "Untitled";
                chatHistory.push({ href: fullHref, title });
            }
        });
    }

    function addCustomButton(button, index) {
        if (!button.nextElementSibling || !button.nextElementSibling.classList.contains("custom-square-btn")) {
            const newButton = document.createElement("button");
            newButton.classList.add("custom-square-btn");
            newButton.innerHTML = "□";
            newButton.setAttribute("aria-label", "Show random overlay");

            // Find nearest <a> for title and href using proximity
            const nearestLink = button.closest("li")?.querySelector("a[href^='/c']") || 
                               button.parentNode.querySelector("a[href^='/c']") || 
                               button.parentNode.parentNode.querySelector("a[href^='/c']");
            const title = nearestLink ? (nearestLink.getAttribute("title") || nearestLink.textContent.trim() || "Untitled") : "Untitled-" + index;
            const href = nearestLink ? `https://chatgpt.com${nearestLink.getAttribute("href")}` : "[No href]";
            const buttonId = sanitizeTitleForId(title);
            newButton.setAttribute("data-button-id", buttonId);

            newButton.setAttribute("data-href", href);

            newButton.addEventListener("click", () => {
                currentChat.title = title;
                currentChat.href = href;
                manageChatManagementOverlay("show"); // Assuming this exists
            });

            button.parentNode.insertBefore(newButton, button.nextSibling);
        }
    }

    function sanitizeTitleForId(title) {
        return "btn-" + title.toLowerCase()
            .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with '-'
            .replace(/-+/g, '-')        // Collapse multiple dashes
            .replace(/^-|-$/g, '');     // Trim leading/trailing dashes
    }

    function watchSlider() {
        const container = findContainer();
        if (container) {

            initializeConversation(container);
        } else {
            // log("Slider not found, waiting...");
        }
        setTimeout(watchSlider, 100); // Check every 100ms
    }

    // Run instantly if DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", watchSlider);
    } else {
        watchSlider(); // Run immediately if DOM is already loaded
    }
}
function updateFolderdata(checkedfolders,uncheckedfolders,chatTitle,chatHref,userData) {
    //console.log(`[updatedFolderData] checked folders:  ${checkedfolders}  uncheckedfolders : ${uncheckedfolders}   chatTitle :  ${chatTitle}  chathref:  ${chatHref}`);
    //need to make sure that the all the checked folder exist if not created 
    checkedfolders.forEach((folderName) => {
        //console.log(`[updateFolderData] Checking folder for adding chat: "${folderName}"`);
        const folderExists = userData.folderStructure.Folders.some(folder => folder.Folder_Name === folderName);
        if (folderExists){
            // console.log(`[updateFolderData] Folder "${folderName}" ${folderExists ? 'already exists' : 'does not exist'} in structure`);
            // console.log(`[updateFolderData] Folder "${folderName}" needed to be updated with "${chatTitle}" and "${chatHref}"`);
        }else{
            //needed to create folder 
            // console.log(`[updateFolderData] Folder "${folderName}" needed to be created and updated`);
            const defaultFolderStructure = {
                    "Folder_Name": folderName,
                    "Chats": []
            };
            userData.folderStructure.Folders.push(defaultFolderStructure);
        }
        let folder = userData.folderStructure.Folders.find(f => f.Folder_Name === folderName);
        let chatexist = folder.Chats.some(chat => chat.title === chatTitle);
        if(chatexist){
            // console.log(`[updateFolderData] chat "${chatTitle}" exist`);
        }else{
            // console.log(`[updateFolderData] chat "${chatTitle}" does not exist . adding new chat`);
            folder.Chats.push({
                "title": chatTitle,
                "href": chatHref
            });
        }
    });

    uncheckedfolders.forEach((folderName) =>{
        //console.log(`[updatedFolderData] folder for unchecking chat:  ${folderName} `);
        const folderExists = userData.folderStructure.Folders.some(folder => folder.Folder_Name === folderName);
        if(folderExists){
            //console.log(`[updatedFolderData] need to remove folder chat from ${folderName} `);

            let folder = userData.folderStructure.Folders.find(f => f.Folder_Name === folderName);

            if (folder) {
                // Remove the chat by filtering out the matching title
                folder.Chats = folder.Chats.filter(chat => chat.title !== chatTitle);
        
                //console.log(`Chat "${chatTitle}" removed from "${folderName}"`);
            } else {
                //console.error(`Folder "${chatTitle}" not found.`);
            }
        }else{
            //console.log(`[updatedFolderData] ${folderName} does not exist. so i wotn bother removing anything `);
        }

    });
}
    // Fetch data from Chrome storage (using your pullDataFromChromeStorage)
async function fetchFromChromeStorage() {
        try {
            let response = await pullDataFromChromeStorage();
            if (!response || !response.folderStructure || !response.folderStructure.Folders) {
                // Initialize default folder structure if it doesn't exist
                const defaultFolders = ["Work", "Personal", "Projects", "Misc"];
                const defaultFolderStructure = {
                                                    "Folders": defaultFolders.map(folder => ({
                                                        "Folder_Name": folder,
                                                        "Chats": []
                                                    }))
                                                };
                chrome.storage.sync.set({ folderStructure: defaultFolderStructure }, () => {
                });
                //console.log("[Overlay] folder structure not found. pushing default folfers:", defaultFolders);
                response = await pullDataFromChromeStorage();
    
            } else {
                let folderNames = response.folderStructure.Folders.map(folder => folder.Folder_Name);
                //console.log("[Overlay] folder structure already exist as shown here",folderNames);
    
            }

            return response;
            
        } catch (error) {
            //console.error("[Overlay] Error fetching folders from Chrome storage:", error);
            return ["Work", "Personal", "Projects", "Misc"]; // Fallback on error
        }
}
function getChatTitles(userData, folderName) {
    // Find the folder that matches the given folder name
    const folder = userData.folderStructure.Folders.find(f => f.Folder_Name === folderName);

    // Check if the folder exists and has chats
    if (folder && folder.Chats.length > 0) {
        const title = folder.Chats.map(chat => chat.title)
        // console.log(`[getChattitle] returning the title ${title}`);
        return folder.Chats.map(chat => chat.title); // Extract only the title values
    } else {
        return []; // Return empty array if no chats exist
    }
}
// Send data to Chrome storage
function pushToChromeStorage(data) {
    try {
        chrome.storage.sync.set(data, function() {
            console.log('Data saved to Chrome Storage.');
        });
    } catch {
        console.error('Invalid data type: folderStructure must be an object.');
    }
}

// Function to render all checkboxes
async function renderCheckboxes(customFolders = [],checkboxList) {
    let rendercheckboxresponse = await fetchFromChromeStorage();
    // console.log(`[renderCheckBoxes]`,JSON.stringify(rendercheckboxresponse));  
    checkboxList.innerHTML = ""; // Clear existing checkboxes
    // console.log('[rendercheckbox] chat title', currentChat.title);
    // console.log('[rendercheckbox] chat href',currentChat.href);
    // // Render fixed folders

    fetchedFolders = rendercheckboxresponse.folderStructure?.Folders?.map(folder => folder.Folder_Name);
    // console.log(`[renderCheckBoxes] fetched folders are`, fetchedFolders);
    // console.log(`[renderCheckBoxes] custom folder passed are `, customFolders);
    fetchedFolders.push(...customFolders); // Spread operator to add multiple items
    // console.log("Updated fetchedFolders:", fetchedFolders);
    fetchedFolders.forEach((folderName, index) => {
        const folder = { name: folderName, id: `checkbox-fixed-${index}` };
        const checkboxContainer = document.createElement("div");
        const checkbox = document.createElement("input");
        const label = document.createElement("label");

        // Set necessary attributes
        checkbox.type = "checkbox";
        checkbox.id = folder.id;
        checkbox.name = folder.name;
        checkbox.className = "overlay-checkbox";
        label.htmlFor = folder.id;
        label.textContent = folder.name;

        // Add classes for styling
        checkboxContainer.className = "checkbox-item";
        label.className = "checkbox-label";

        // Check if chat exists in this folder
        let chatTitles = getChatTitles(rendercheckboxresponse, folderName);
        if (chatTitles.includes(currentChat.title)){
            checkbox.checked = true;
        }

        // Append elements
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxList.appendChild(checkboxContainer);
    });
}




function manageChatManagementOverlay(action) {
    let overlay = document.getElementById("custom-overlay");
    let customFolders = []; // Store custom folder options locally

    if (action === "show") {
        overlayActvated = true;
        //console.log("[Overlay] Showing overlay with data:", currentChat.href, currentChat.title); // Debug: Log incoming data
        // Fetch initial folders from Chrome storage
        fetchFromChromeStorage().then(response => {
            //console.log('[overlay] before the folder pushing',JSON.stringify(response, null, 2));
            fetchedFolders = response.folderStructure?.Folders?.map(folder => folder.Folder_Name);
            // console.log(fetchedFolders);
            if (!overlay) {
                // Create overlay
                overlay = document.createElement("div");
                overlay.id = "custom-overlay";
                overlay.className = "custom-overlay";

                // Create message box
                const messageBox = document.createElement("div");
                messageBox.className = "overlay-message-box";

                // Add folder checkbox list
                const checkboxList = document.createElement("div");
                checkboxList.className = "checkbox-list";
                messageBox.appendChild(checkboxList);
              // Initial render of checkboxes
                //console.log('[overlay] before the folder pushing',JSON.stringify(response));
                renderCheckboxes(undefined,checkboxList);

                // Add folder creation input and button
                const createFolderContainer = document.createElement("div");
                createFolderContainer.className = "create-folder-container";
                const folderInput = document.createElement("input");
                folderInput.type = "text";
                folderInput.placeholder = "Enter folder name";
                folderInput.className = "folder-input";

                const createButton = document.createElement("button");
                createButton.textContent = "Create";
                createButton.className = "create-folder-btn";
                createButton.addEventListener("click", async () => {
                    const folderName = folderInput.value.trim();
                    if (folderName && !fetchedFolders.includes(folderName) && !customFolders.includes(folderName)) {
                        customFolders.push(folderName);
                        renderCheckboxes(customFolders,checkboxList);
                        folderInput.value = ""; // Clear input
                        console.log("[Overlay] Added custom folder:", folderName); // Debug
                    } else if (!folderName) {
                        console.log("[Overlay] Folder name cannot be empty");
                    } else {
                        console.log("[Overlay] Folder name already exists:", folderName);
                    }
                });

                createFolderContainer.appendChild(folderInput);
                createFolderContainer.appendChild(createButton);
                messageBox.appendChild(createFolderContainer);

                // Add close button (top-right)
                const closeButton = document.createElement("button");
                closeButton.className = "overlay-close-btn";
                closeButton.setAttribute("aria-label", "Close overlay");
                closeButton.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                closeButton.addEventListener("click", () => {
                    overlayActvated = false;
                    overlay.style.display = "none";
                });
                messageBox.appendChild(closeButton);

                // Add OK button (bottom-right)
                const okButton = document.createElement("button");
                okButton.className = "overlay-ok-btn";
                okButton.textContent = "OK";
                okButton.addEventListener("click", async () => {
                    // console.log('chat title', currentChat.title);
                    // console.log('chat href',currentChat.href);
                    const response = await fetchFromChromeStorage(); // Fetch data first
                    const fetchedFolders = response.folderStructure.Folders.map(folder => folder.Folder_Name); // Extract folder names
                    const checkedFolder = Array.from(document.querySelectorAll(".overlay-checkbox:checked"))
                        .map(checkbox => checkbox.name);
                    // console.log("[Overlay] Checked folder :", checkedFolder); // Debug: Log folder names
                    // console.log("[overlay] fetched folder : ", fetchedFolders);
                    let difference = fetchedFolders.filter(folder => !checkedFolder.includes(folder));
                    // console.log("Items in fetched folder but not in checked folder:", difference);
                    updateFolderdata(checkedFolder,difference,currentChat.title,currentChat.href,response);
                    // console.log('[overlay] after new folder pushing : ',JSON.stringify(response));
                    pushToChromeStorage(response);
                    currentChat.title = "";
                    currentChat.href = "";
                    overlay.style.display = "none";
                    overlayActvated = false;
                    customFolders = [];
                });
                messageBox.appendChild(okButton);

                overlay.appendChild(messageBox);
                document.body.appendChild(overlay);
            } else {
                // Reset checkboxes and update if overlay exists
                const checkboxList = overlay.querySelector(".checkbox-list");
                const checkboxes = overlay.querySelectorAll(".overlay-checkbox");
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                    //console.log("[Overlay] Reset checkbox:", checkbox.name); // Debug: Confirm reset
                });
                renderCheckboxes(undefined,checkboxList); // Re-render with current fixed and custom folders
            }

            // Show overlay
            overlay.style.display = "flex";
        });
    }
}





async function pullDataFromChromeStorage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, (stored_data) => {
            if (stored_data.hasOwnProperty('useremail')) {
                updateButtonText(stored_data['useremail']);
            } else {
                console.log("No existing user found. Will change the button to log in");
                updateButtonText('login');
            }
            resolve(stored_data); // Resolve with the data
        });
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
    const button = document.getElementById('LOGINBUTTON');
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
        // Example usage 
        updateChatHistoryToFirebaseServer(usermail);
    }
});

document.getElementById("LOGINBUTTON").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openpopup" });
});




function hideFlexSection() {
    const flexSection = document.querySelector("body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div > main > div.composer-parent.flex.h-full.flex-col.focus-visible\\:outline-0 > div.isolate.w-full.has-\\[\\[data-has-thread-error\\]\\]\\:pt-2.has-\\[\\[data-has-thread-error\\]\\]\\:\\[box-shadow\\:var\\(--sharp-edge-bottom-shadow\\)\\].dark\\:border-white\\/20.md\\:border-transparent.md\\:pt-0.md\\:dark\\:border-transparent > div.text-base.mx-auto.px-3.md\\:px-4.w-full.md\\:px-5.lg\\:px-4.xl\\:px-5 > div");
    
    if (flexSection && isSearchVisible == true) {
        isSearchVisible = false;
        // Store original display style
        console.log(`should hid the ask box`);
        flexSection.dataset.originalDisplay = getComputedStyle(flexSection).display;
        
        // Animation setup
        flexSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        flexSection.style.opacity = '0';
        flexSection.style.transform = 'translateY(-10px)';

        // Hide completely after animation
        setTimeout(() => {
            flexSection.style.display = 'none';
            flexSection.style.transform = ''; // Reset transform
        }, 3); // Match transition duration (3ms)
        
    }
}
function showFlexSection() {
    const flexSection = document.querySelector("body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div > main > div.composer-parent.flex.h-full.flex-col.focus-visible\\:outline-0 > div.isolate.w-full.has-\\[\\[data-has-thread-error\\]\\]\\:pt-2.has-\\[\\[data-has-thread-error\\]\\]\\:\\[box-shadow\\:var\\(--sharp-edge-bottom-shadow\\)\\].dark\\:border-white\\/20.md\\:border-transparent.md\\:pt-0.md\\:dark\\:border-transparent > div.text-base.mx-auto.px-3.md\\:px-4.w-full.md\\:px-5.lg\\:px-4.xl\\:px-5 > div");
    if (flexSection && isSearchVisible == false) {
        isSearchVisible = true;
        console.log(`should show the ask box`);
        // Initial state before animation
        flexSection.style.display = flexSection.dataset.originalDisplay || 'flex';
        flexSection.style.opacity = '0';
        flexSection.style.transform = 'translateY(-10px)';

        // Trigger reflow to enable animation
        void flexSection.offsetHeight;

        // Animate in
        flexSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        flexSection.style.opacity = '1';
        flexSection.style.transform = 'translateY(0)';

        // Cleanup after animation
        setTimeout(() => {
            flexSection.style.transition = '';
        }, 300);
        
    }
}




// Use MutationObserver to handle dynamic DOM loading
const domInitializer = new MutationObserver((mutations) => {
    if (document.body) {
      console.log("DOM ready, adding button and overlay");
  
      domInitializer.disconnect(); // Stop observing once body is found
  
      // Create the button to show overlay
      const button = document.createElement("button");
      button.textContent = "Show Overlay";
      button.style.position = "fixed";
      button.style.bottom = "20px";
      button.style.right = "20px";
      button.style.padding = "10px 20px";
      button.style.backgroundColor = "#007bff";
      button.style.color = "white";
      button.style.border = "none";
      button.style.borderRadius = "5px";
      button.style.cursor = "pointer";
      button.style.zIndex = "10001";
      document.body.appendChild(button);
  
      // Create the overlay
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.right = "-300px"; // Start off-screen to the right
      overlay.style.width = "300px";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
      overlay.style.transition = "right 0.5s ease, width 0.3s ease"; // Smooth slide and width change
      overlay.style.zIndex = "10000";
      overlay.style.overflowY = "auto"; // Scroll if content overflows
      document.body.appendChild(overlay);
  
      // Create draggable handle
      const handle = document.createElement("div");
      handle.style.position = "absolute";
      handle.style.top = "0";
      handle.style.left = "-10px";
      handle.style.width = "10px";
      handle.style.height = "100%";
      handle.style.cursor = "ew-resize";
      handle.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      overlay.appendChild(handle);
  
      // Create close button
      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      closeButton.style.position = "absolute";
      closeButton.style.top = "10px";
      closeButton.style.right = "10px";
      closeButton.style.padding = "5px";
      closeButton.style.backgroundColor = "#ff4444";
      closeButton.style.color = "white";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "50%";
      closeButton.style.cursor = "pointer";
      closeButton.style.zIndex = "10002";
      overlay.appendChild(closeButton);
  
      // Create button to add new folder
      const addFolderButton = document.createElement("button");
      addFolderButton.textContent = "Add Folder";
      addFolderButton.style.position = "absolute";
      addFolderButton.style.top = "10px";
      addFolderButton.style.left = "10px";
      addFolderButton.style.padding = "5px 10px";
      addFolderButton.style.backgroundColor = "#28a745";
      addFolderButton.style.color = "white";
      addFolderButton.style.border = "none";
      addFolderButton.style.borderRadius = "5px";
      addFolderButton.style.cursor = "pointer";
      addFolderButton.style.zIndex = "10002";
      overlay.appendChild(addFolderButton);
  
      // Create folder structure inside overlay
      const folders = [
        { name: "X", items: ["1", "2", "3"] },
        { name: "Y", items: ["1", "2", "3"] },
        { name: "Z", items: ["1", "2", "3"] }
      ];
  
      const folderContainer = document.createElement("div");
      folderContainer.style.padding = "20px";
      folderContainer.style.color = "white";
      folderContainer.style.paddingTop = "50px"; // Space for the add button
  
      function renderFolders() {
        folderContainer.innerHTML = ""; // Clear existing folders
        folders.forEach((folder, index) => {
          const folderDiv = document.createElement("div");
          folderDiv.style.marginBottom = "15px";
          folderDiv.style.position = "relative"; // For positioning dropdown
  
          // Folder header with icon
          const folderHeaderWrapper = document.createElement("div");
          folderHeaderWrapper.style.display = "flex";
          folderHeaderWrapper.style.alignItems = "center";
  
          const folderHeader = document.createElement("h3");
          folderHeader.textContent = folder.name;
          folderHeader.style.cursor = "pointer";
          folderHeader.style.margin = "0";
          folderHeader.style.padding = "5px";
          folderHeader.style.backgroundColor = "#333";
          folderHeader.style.flex = "1";
          folderHeader.addEventListener("click", (e) => {
            // Prevent toggling when clicking the input field
            if (e.target.tagName !== "INPUT") {
              toggleFolder(folderDiv, folderHeader);
            }
          });
  
          // Options icon (three dots)
          const optionsIcon = document.createElement("span");
          optionsIcon.textContent = "⋮";
          optionsIcon.style.cursor = "pointer";
          optionsIcon.style.padding = "5px";
          optionsIcon.style.fontSize = "20px";
          optionsIcon.style.color = "white";
          optionsIcon.addEventListener("click", (e) => toggleOptionsMenu(e, folderDiv, index));
  
          folderHeaderWrapper.appendChild(folderHeader);
          folderHeaderWrapper.appendChild(optionsIcon);
  
          // Dropdown menu for options
          const optionsMenu = document.createElement("div");
          optionsMenu.className = "options-menu";
          optionsMenu.style.position = "absolute";
          optionsMenu.style.top = "30px";
          optionsMenu.style.right = "0";
          optionsMenu.style.backgroundColor = "#444";
          optionsMenu.style.borderRadius = "5px";
          optionsMenu.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";
          optionsMenu.style.display = "none";
          optionsMenu.style.zIndex = "10003";
  
          const renameOption = document.createElement("div");
          renameOption.textContent = "Rename";
          renameOption.style.padding = "5px 10px";
          renameOption.style.cursor = "pointer";
          renameOption.style.color = "white";
          renameOption.addEventListener("click", () => {
            // Replace folder name with input field
            const input = document.createElement("input");
            input.type = "text";
            input.value = folder.name;
            input.style.width = "80%";
            input.style.padding = "5px";
            input.style.margin = "0";
            input.style.backgroundColor = "#555";
            input.style.color = "white";
            input.style.border = "none";
            input.style.outline = "none";
  
            // Replace header content with input
            folderHeader.textContent = "";
            folderHeader.appendChild(input);
            input.focus();
  
            // Save on Enter or blur
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                saveNewName(input.value, index);
                renderFolders();
              }
            });
            input.addEventListener("blur", () => {
              saveNewName(input.value, index);
              renderFolders();
            });
  
            optionsMenu.style.display = "none";
          });
  
          const deleteOption = document.createElement("div");
          deleteOption.textContent = "Delete";
          deleteOption.style.padding = "5px 10px";
          deleteOption.style.cursor = "pointer";
          deleteOption.style.color = "white";
          deleteOption.addEventListener("click", () => {
            // Delete the folder immediately
            folders.splice(index, 1);
            renderFolders();
            optionsMenu.style.display = "none";
          });
  
          optionsMenu.appendChild(renameOption);
          optionsMenu.appendChild(deleteOption);
          folderDiv.appendChild(optionsMenu);
  
          const itemList = document.createElement("ul");
          itemList.style.listStyle = "none";
          itemList.style.padding = "0";
          itemList.style.maxHeight = "0";
          itemList.style.overflow = "hidden";
          itemList.style.transition = "max-height 0.3s ease";
  
          folder.items.forEach(item => {
            const itemLink = document.createElement("a");
            itemLink.href = "https://www.google.com";
            itemLink.textContent = item;
            itemLink.style.color = "white";
            itemLink.style.textDecoration = "none";
            itemLink.style.display = "block";
            itemLink.style.padding = "5px";
            itemLink.target = "_blank";
  
            const listItem = document.createElement("li");
            listItem.appendChild(itemLink);
            itemList.appendChild(listItem);
          });
  
          folderDiv.appendChild(folderHeaderWrapper);
          folderDiv.appendChild(itemList);
          folderContainer.appendChild(folderDiv);
        });
      }
  
      renderFolders();
      overlay.appendChild(folderContainer);
  
      // Add new folder on button click
      addFolderButton.addEventListener("click", () => {
        const newFolder = { name: "New Folder", items: ["1", "2", "3"] };
        folders.push(newFolder);
        renderFolders();
      });
  
      // Toggle folder visibility function
      function toggleFolder(folderDiv, header) {
        const itemList = folderDiv.querySelector("ul");
        if (itemList.style.maxHeight === "0px" || itemList.style.maxHeight === "") {
          itemList.style.maxHeight = itemList.scrollHeight + "px";
          header.style.backgroundColor = "#555";
        } else {
          itemList.style.maxHeight = "0";
          header.style.backgroundColor = "#333";
        }
      }
  
      // Save new folder name
      function saveNewName(newName, index) {
        if (newName.trim()) {
          folders[index].name = newName.trim();
        }
      }
  
      // Toggle options menu
      function toggleOptionsMenu(e, folderDiv, index) {
        e.stopPropagation(); // Prevent folder collapse/expand
        const optionsMenu = folderDiv.querySelector(".options-menu");
        if (optionsMenu.style.display === "block") {
          optionsMenu.style.display = "none";
        } else {
          // Close other open menus
          document.querySelectorAll(".options-menu").forEach(menu => {
            menu.style.display = "none";
          });
          optionsMenu.style.display = "block";
        }
      }
  
      // Draggable handle functionality
      let isDragging = false;
      let startX;
      handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        overlay.style.transition = "none"; // Disable transition during drag
      });
  
      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          const diffX = startX - e.clientX;
          let newWidth = parseInt(overlay.style.width) - diffX;
          if (newWidth < 200) newWidth = 200; // Minimum width
          if (newWidth > window.innerWidth - 50) newWidth = window.innerWidth - 50; // Maximum width
          overlay.style.width = newWidth + "px";
          startX = e.clientX;
        }
      });
  
      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          overlay.style.transition = "right 0.5s ease, width 0.3s ease"; // Re-enable transition
        }
      });
  
      // Toggle overlay on button click
      button.addEventListener("click", function () {
        if (overlay.style.right === "0px") {
          overlay.style.right = "-300px"; // Slide out
        } else {
          overlay.style.right = "0"; // Slide in
        }
      });
  
      // Close overlay when clicking outside
      document.addEventListener("click", (e) => {
        if (!overlay.contains(e.target) && overlay.style.right === "0px" && e.target !== button) {
          overlay.style.right = "-300px"; // Slide out if clicked outside
        }
        // Close any open options menus
        document.querySelectorAll(".options-menu").forEach(menu => {
          menu.style.display = "none";
        });
      });
  
      // Close overlay with close button
      closeButton.addEventListener("click", () => {
        overlay.style.right = "-300px"; // Slide out
      });
    }
  });
  
  // Start observing the document for changes
  domInitializer.observe(document.documentElement, { childList: true, subtree: true });




// Use MutationObserver to handle dynamic DOM loading
const domwatcherforaskbox = new MutationObserver((mutations) => {
  if (document.body) {
    console.log("Document body found, adding mousemove listener");

    domwatcherforaskbox.disconnect(); // Stop observing once body is found

    document.addEventListener("mousemove", function (event) {
        const windowHeight = window.innerHeight; // Total height of the viewport
        const windowWidth = window.innerWidth; // Total width of the viewport
        const bottom30Percent = windowHeight * 0.7; // 70% of the screen (top 70%), so bottom 30% is > 70%
        const right30percent = windowWidth * 0.8; 
        const left30percent =  windowWidth * 0.2;
        const mouseY = event.clientY; // Vertical position of the mouse cursor
        const mouseX = event.clientX;

        if (overlayActvated == false){
            if (mouseY > bottom30Percent && mouseX < right30percent) {
                showFlexSection();
                // console.log(`[mouseobserver] below 30 percent`);
            }else if ( mouseY < (bottom30Percent *.8) ){
                // console.log(`[mouseobserver] avobe 30 percent`);
                hideFlexSection();
            }
        }


    });
  }
});

// Start observing the document for changes
domwatcherforaskbox.observe(document.documentElement, { childList: true, subtree: true });


//==================================================================//
// Assume html2pdf.bundle.min.js is included in your extension
// Assume html2pdf.bundle.min.js is included in your extension via manifest.json

// Function to generate and download the PDF

  // Create and style the button
function createButton() {
    const button = document.createElement("button");
    button.textContent = "Download PDF";
    button.id = "pdf-download-btn"; // Unique ID to avoid duplicates
  
    // Style the button (fixed top-left position)
    button.style.position = "fixed";
    button.style.top = "10px";
    button.style.left = "60px";
    button.style.zIndex = "9999"; // Ensure it’s on top of other content
    button.style.padding = "8px 12px";
    button.style.backgroundColor = "#4CAF50"; // Green background
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontFamily = "Arial, sans-serif";
  
    // Add hover effect
    button.onmouseover = () => (button.style.backgroundColor = "#45a049");
    button.onmouseout = () => (button.style.backgroundColor = "#4CAF50");
  
    // Add click event to trigger PDF generation
    button.addEventListener("click", () =>{
        scrollToEndAndCreatePDF();

    });

    // Append the button to the body (only if it doesn’t already exist)
    if (!document.getElementById("pdf-download-btn")) {
      document.body.appendChild(button);
    }
}
  
// Execute the button creation when the script loads
createButton();



async function captureInvertedScreenshotAsImage(options = {}) {
    const { startXPercent = 0.35, widthPercent = 0.65 } = options;

    console.log("Capturing and inverting colors...");

    // Capture full viewport
    const fullScreenshot = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "capture" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Message error:", chrome.runtime.lastError.message);
                resolve(null);
                return;
            }
            if (!response || !response.dataUrl) {
                console.error("Capture failed: No data URL received", response);
                resolve(null);
                return;
            }
            resolve(response.dataUrl);
        });
    });

    if (!fullScreenshot) {
        console.error("Failed to capture full screenshot.");
        return null;
    }

    // Load the full screenshot into an image
    const img = new Image();
    img.src = fullScreenshot;
    await new Promise((resolve) => (img.onload = resolve));

    // Define crop dimensions
    const fullWidth = img.width;
    const fullHeight = img.height;
    const startX = Math.floor(fullWidth * startXPercent);
    const cropWidth = Math.floor(fullWidth * widthPercent);

    // Create canvas for cropping and inverting
    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext("2d");

    // Draw the cropped portion
    ctx.drawImage(img, startX, 0, cropWidth, fullHeight, 0, 0, cropWidth, fullHeight);

    // Invert colors
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
    }

    ctx.putImageData(imageData, 0, 0);

    // Return the image data
    return {
        dataUrl: canvas.toDataURL("image/png"),
        width: cropWidth,
        height: fullHeight
    };
}

async function scrollToEndAndCreatePDF(options = {}) {
    const {
        stepSize = window.innerHeight,
        delayMs = 1000,
        fileName = "complete_document",
        onScroll = (pos, total) => console.log(`Scrolled to ${pos}/${total}`)
    } = options;

    const { jsPDF } = window.jspdf;

    const scrollContainer = document.querySelector("body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div > main > div.composer-parent.flex.h-full.flex-col.focus-visible\\:outline-0 > div.flex-1.grow.basis-auto.overflow-hidden.\\@container\\/thread > div > div");

    if (!scrollContainer) {
        console.error("Scroll container not found!");
        return;
    }

    let totalHeight = scrollContainer.scrollHeight;
    let currentPosition = 0;
    const capturedImages = [];

    console.log(`Container Height: ${scrollContainer.clientHeight}, Total Scrollable Height: ${totalHeight}`);

    if (totalHeight <= scrollContainer.clientHeight) {
        console.warn("Container height is less than or equal to visible height. Capturing single image.");
        const imageData = await captureInvertedScreenshotAsImage();
        if (imageData) capturedImages.push(imageData);
    } else {
        console.log(`Starting scroll. Step size: ${stepSize}, Total height: ${totalHeight}`);

        while (currentPosition < totalHeight) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            const actualPosition = scrollContainer.scrollTop;
            if (actualPosition !== currentPosition) {
                console.warn(`Scroll mismatch: Expected ${currentPosition}, Got ${actualPosition}`);
                scrollContainer.scrollTo({ top: currentPosition });
                await new Promise((resolve) => setTimeout(resolve, delayMs / 2));
            }

            const imageData = await captureInvertedScreenshotAsImage();
            if (imageData) capturedImages.push(imageData);

            onScroll(currentPosition, totalHeight);

            currentPosition += stepSize;
            totalHeight = scrollContainer.scrollHeight;
            console.log(`Updated Total Height: ${totalHeight}`);

            if (currentPosition + stepSize > totalHeight) {
                currentPosition = totalHeight;
            }
        }
    }

    console.log("Reached the end of the scrollable container!");
    console.log(`Creating PDF with ${capturedImages.length} pages`);

    // Create single PDF
    const doc = new jsPDF({
        unit: "px",
        format: "a4"
    });
    const a4Width = 595;
    const a4Height = 842;

    capturedImages.forEach((image, index) => {
        if (index > 0) doc.addPage();
        
        const scaleFactor = a4Width / image.width;
        const scaledHeight = image.height * scaleFactor;
        
        doc.addImage(image.dataUrl, "PNG", 0, 0, a4Width, Math.min(scaledHeight, a4Height));
    });

    doc.save(`${fileName}.pdf`);
    console.log(`Saved complete document as ${fileName}.pdf`);
}