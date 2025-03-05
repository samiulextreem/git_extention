console.log("Current URL from content.js:", window.location.href);
let chatHistory = [];
let currentChat = {
    title: "", // Default empty string
    href: ""   // Default empty string
};

createLogInButton(); // Call the renamed function to add the button
addLoginButton();             // add log in button
showButtonOnTextSelection();




async function pushDataToFirebase(useremail, merged_data) {
	let dataToPush  = await merged_data; // Merge with existing data and update to server
    console.log("the following data is going to be pushed", dataToPush);
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

	// pushDataToFirebase(usermail, mergeData(historyData));

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

function getHrefsFromContainer() {
    function findContainer() {
        return document.querySelector(
            "body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div.z-\\[21\\].flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary.max-md\\:\\!w-0 > div"
        );
    }

    function log(message) {
        console.log(`[getHrefs] ${message}`);
    }

    function startWatching() {
        const container = findContainer();
        if (!container) {
            log("Container not found, retrying...");
            setTimeout(startWatching, 1000);
            return;
        }

        log("Container found");
        updateHrefs(container);
    }

    function updateHrefs(container) {
        chatHistory.length = 0; // Clear previous results
        const linkElements = container.querySelectorAll("a[href]");
        linkElements.forEach((link) => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("/c")) {
                const fullHref = `https://chatgpt.com${href}`;
                const title = link.getAttribute("title") || link.textContent.trim() || "";
                chatHistory.push({ href: fullHref, title });
            }
        });
        log(`Found ${chatHistory.length} hrefs and titles:`, chatHistory);
    }

    startWatching();
    return chatHistory;
}

function manageButtonForConversation() {
    function findContainer() {
        return document.querySelector(
            "body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div.z-\\[21\\].flex-shrink-0.overflow-x-hidden.bg-token-sidebar-surface-primary.max-md\\:\\!w-0 > div > div > div > nav > div.flex-col.flex-1.transition-opacity.duration-500.relative.pr-3.overflow-y-auto > div > div.flex.flex-col.gap-2.text-token-text-primary.text-sm.mt-5.first\\:mt-0.false"
        );
    }

    function log(message) {
        console.log(`[Buttons] ${message}`);
    }

    function startWatching() {
        const container = findContainer();
        if (!container) {
            log("Container not found, retrying...");
            setTimeout(startWatching, 1000);
            return;
        }

        log("Container found");
        updateButtons(container);
    }

    function updateButtons(container) {
        const buttons = container.querySelectorAll("button:not(.custom-square-btn)");
        log(`Found ${buttons.length} original buttons`);

        buttons.forEach((button, index) => addCustomButton(button, index));

        const observer = new MutationObserver(() => {
            const currentButtons = container.querySelectorAll("button:not(.custom-square-btn)");
            log(`DOM changed, found ${currentButtons.length} original buttons`);
            currentButtons.forEach((button, index) => addCustomButton(button, index));
        });
        observer.observe(container, { childList: true, subtree: true });
    }


    startWatching();
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

    function getButtonDetails(button, index) {
        return {
            index: index + 1,
            text: button.textContent.trim() || "[No text]",
            ariaLabel: button.getAttribute("aria-label") || "[No aria-label]",
            id: button.id || "[No ID]",
            classes: button.className || "[No classes]"
        };
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
            log("Slider not found, waiting...");
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



// Run it
manageConversationButtonsAndTitles();

function manageChatManagementOverlay(action) {
    let overlay = document.getElementById("custom-overlay");
    let customFolders = []; // Store custom folder options locally
    let fetchedFolders; // Declare outside to share scope
    let checkboxresponse;
    // Function to update folder with specified folders
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
            let chatexist  =  folder.Chats.some(chat => chat.title === chatTitle);
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
                response  = await pullDataFromChromeStorage();
    
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
            console.log(`[getChattitle] returning the title ${title}`);
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
    async function renderCheckboxes(checkboxList) {
        let rendercheckboxresponse = await fetchFromChromeStorage();
        // console.log(`[renderCheckBoxes]`,JSON.stringify(rendercheckboxresponse));  
        checkboxList.innerHTML = ""; // Clear existing checkboxes
        // console.log('[rendercheckbox] chat title', currentChat.title);
        // console.log('[rendercheckbox] chat href',currentChat.href);
        // // Render fixed folders
        fetchedFolders.forEach((folderName, index) => {
            const folder = { name: folderName, id: `checkbox-fixed-${index}` };
            const checkboxContainer = document.createElement("div");

            // console.log(` [rendercheckbox ] for folder name ${folderName} grabbed chat title`);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = folder.id;
            checkbox.name = folder.name;
            checkbox.className = "overlay-checkbox";



            const label = document.createElement("label");
            label.htmlFor = folder.id;
            label.textContent = folder.name;
            label.className = "checkbox-label";
            checkboxContainer.className = "checkbox-item";
            let chatTitles = getChatTitles(rendercheckboxresponse, folderName);
            if (chatTitles.includes(currentChat.title)){
                checkbox.checked = true;
            }

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxList.appendChild(checkboxContainer);
        });

        // Render custom folders
        customFolders.forEach((folder, folderIndex) => {
            const checkboxContainer = document.createElement("div");
            checkboxContainer.className = "checkbox-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = folder.id;
            checkbox.name = folder.name;
            checkbox.className = "overlay-checkbox";
            //console.log("[Overlay] Created custom folder checkbox:", folder.name); // Debug

            const label = document.createElement("label");
            label.htmlFor = folder.id;
            label.textContent = folder.name;
            label.className = "checkbox-label";

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxList.appendChild(checkboxContainer);
        });
    }

    if (action === "show") {
        //console.log("[Overlay] Showing overlay with data:", currentChat.href, currentChat.title); // Debug: Log incoming data
        // Fetch initial folders from Chrome storage
        fetchFromChromeStorage().then(response => {
            //console.log('[overlay] before the folder pushing',JSON.stringify(response, null, 2));
            fetchedFolders = response.folderStructure?.Folders?.map(folder => folder.Folder_Name) ;
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
                renderCheckboxes(checkboxList);

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
                    if (folderName && !fetchedFolders.includes(folderName) && !customFolders.some(f => f.name === folderName)) {
                        customFolders.push({ name: folderName, id: `checkbox-custom-${customFolders.length + 1}` });
                        renderCheckboxes(checkboxList);
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
                renderCheckboxes(checkboxList); // Re-render with current fixed and custom folders
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