console.log("Current URL from content.js:", window.location.href);
console.log("content.js loaded");


let currentChat = {
    title: "", // Default empty string
    href: ""   // Default empty string
};
let isSearchVisible = true;
let overlayActvated = false;

// Declare folders at the top level
let folders = [
    { name: "X", items: ["1", "2", "3"] },
    { name: "Y", items: ["1", "2", "3"] },
    { name: "Z", items: ["1", "2", "3"] }
];

showButtonOnTextSelection();
manageConversationButtonsAndTitles();
pdfmaker();



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
function updateFolderdata(checkedfolders, uncheckedfolders, chatTitle, chatHref, userData) {
    // Ensure folderStructure is initialized
    if (!userData.folder_structure.chatgpt) {
        userData.folder_structure.chatgpt = { Folders: [] }; // Initialize if undefined
    }
    
    // Ensure Folders is initialized
    if (!userData.folder_structure.chatgpt.Folders) {
        userData.folder_structure.chatgpt.Folders = []; // Initialize if undefined
    }

    checkedfolders.forEach((folderName) => {
        const folderExists = userData.folder_structure.chatgpt.Folders.some(folder => folder.Folder_Name === folderName);
        if (!folderExists) {
            // Create folder if it doesn't exist
            const defaultFolderStructure = {
                "Folder_Name": folderName,
                "Chats": []
            };
            userData.folder_structure.chatgpt.Folders.push(defaultFolderStructure);
        }
        
        let folder = userData.folder_structure.chatgpt.Folders.find(f => f.Folder_Name === folderName);
        let chatExists = folder.Chats.some(chat => chat.title === chatTitle);
        if (!chatExists) {
            folder.Chats.push({
                "title": chatTitle,
                "href": chatHref
            });
        }
    });

    uncheckedfolders.forEach((folderName) => {
        const folderExists = userData.folder_structure.chatgpt.Folders.some(folder => folder.Folder_Name === folderName);
        if (folderExists) {
            let folder = userData.folder_structure.chatgpt.Folders.find(f => f.Folder_Name === folderName);
            if (folder) {
                // Remove the chat by filtering out the matching title
                folder.Chats = folder.Chats.filter(chat => chat.title !== chatTitle);
            }
        }
    });
}

async function fetchFromChromeStorage() {
    try {
        let response = await pullDataFromChromeStorage();
        
        // Check if response and its structure are defined
        if (!response || !response.folder_structure || !response.folder_structure.chatgpt || !response.folder_structure.chatgpt.Folders) {
            // Initialize default folder structure if it doesn't exist
            const defaultFolders = ["Work", "Personal", "Projects", "Misc"];
            const defaultFolderStructure = {
                "folder_structure": {
                    "chatgpt": {
                        "Folders": defaultFolders.map(folder => ({
                            "Folder_Name": folder,
                            "Chats": []
                        }))
                    }
                }
            };
            
            // Save the default structure to Chrome storage
            await chrome.storage.sync.set(defaultFolderStructure);
            console.log("[Overlay] folder structure not found. Pushed default folders:", defaultFolders);
            response = await pullDataFromChromeStorage(); // Fetch again after setting defaults
        } else {
            let folderNames = response.folder_structure.chatgpt.Folders.map(folder => folder.Folder_Name);
            // console.log("[Overlay] folder structure already exists as shown here", folderNames);
        }

        return response;
        
    } catch (error) {
        console.error("[Overlay] Error fetching folders from Chrome storage:", error);
        return { folder_structure: { chatgpt: { Folders: [] } } }; // Return a safe default structure
    }
}
function getChatTitles(userData, folderName) {
    // Find the folder that matches the given folder name
    const folder = userData.folder_structure.chatgpt.Folders.find(f => f.Folder_Name === folderName);

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
    // console.log(`[renderCheckBoxes]`, JSON.stringify(rendercheckboxresponse, null, 2));
    checkboxList.innerHTML = ""; // Clear existing checkboxes
    // console.log('[rendercheckbox] chat title', currentChat.title);
    // console.log('[rendercheckbox] chat href',currentChat.href);
    // // Render fixed folders

    fetchedFolders = rendercheckboxresponse.folder_structure.chatgpt.Folders?.map(folder => folder.Folder_Name);

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
    let folderchoiceoverlay = document.getElementById("folderchoice-container");
    let customFolders = []; // Store custom folder options locally
    


    if (action === "show") {
        overlayActvated = true;
        fetchFromChromeStorage().then(response => {
            // console.log('[overlay] before the folder pushing', JSON.stringify(response, null, 2));
            fetchedFolders = response.folder_structure.chatgpt.Folders?.map(folder => folder.Folder_Name);
            if (!folderchoiceoverlay) {
                // Create overlay
                folderchoiceoverlay = document.createElement("div");
                folderchoiceoverlay.id = "folderchoice-container";
                folderchoiceoverlay.className = "folderchoice-overlay";

                // Create message box
                const messageBox = document.createElement("div");
                messageBox.className = "overlay-message-box";

                // Add folder checkbox list
                const checkboxList = document.createElement("div");
                checkboxList.className = "checkbox-list";
                messageBox.appendChild(checkboxList);
                renderCheckboxes(undefined, checkboxList);

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
                        renderCheckboxes(customFolders, checkboxList);
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
                    folderchoiceoverlay.style.display = "none";
                });
                messageBox.appendChild(closeButton);

                // Add OK button (bottom-right)
                const okButton = document.createElement("button");
                okButton.className = "overlay-ok-btn";
                okButton.textContent = "OK";
                okButton.addEventListener("click", async () => {
                    const response = await fetchFromChromeStorage(); // Fetch data first
                    const fetchedFolders = response.folder_structure.chatgpt.Folders.map(folder => folder.Folder_Name);
                    const checkedFolder = Array.from(document.querySelectorAll(".overlay-checkbox:checked"))
                        .map(checkbox => checkbox.name);
                    let difference = fetchedFolders.filter(folder => !checkedFolder.includes(folder));
                    updateFolderdata(checkedFolder, difference, currentChat.title, currentChat.href, response);
                    pushToChromeStorage(response);
                    currentChat.title = "";
                    currentChat.href = "";
                    folderchoiceoverlay.style.display = "none";
                    overlayActvated = false;
                    customFolders = [];
                });
                messageBox.appendChild(okButton);

                folderchoiceoverlay.appendChild(messageBox);
                document.body.appendChild(folderchoiceoverlay);
            } else {
                // Reset checkboxes and update if overlay exists
                const checkboxList = folderchoiceoverlay.querySelector(".checkbox-list");
                const checkboxes = folderchoiceoverlay.querySelectorAll(".overlay-checkbox");
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                renderCheckboxes(undefined, checkboxList); // Re-render with current fixed and custom folders
            }

            // Show overlay
            folderchoiceoverlay.style.display = "flex";
            
        });
    }
    

}
async function pullDataFromChromeStorage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, (stored_data) => {
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








chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "pullDataFromChromeStorage") {
        pullDataFromChromeStorage();
    }
});


function hideFlexSection() {
    const flexSection = document.querySelector("body > div.flex.h-full.w-full.flex-col > div > div.relative.flex.h-full.w-full.flex-row.overflow-hidden > div > main > div.composer-parent.flex.h-full.flex-col.focus-visible\\:outline-0 > div.isolate.w-full.has-\\[\\[data-has-thread-error\\]\\]\\:pt-2.has-\\[\\[data-has-thread-error\\]\\]\\:\\[box-shadow\\:var\\(--sharp-edge-bottom-shadow\\)\\].dark\\:border-white\\/20.md\\:border-transparent.md\\:pt-0.md\\:dark\\:border-transparent > div.text-base.mx-auto.px-3.md\\:px-4.w-full.md\\:px-5.lg\\:px-4.xl\\:px-5 > div");
    
    if (flexSection && isSearchVisible == true) {
        isSearchVisible = false;
        // Store original display style
        // console.log(`should hid the ask box`);
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
        // console.log(`should show the ask box`);
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




// Function to create menu button and overlay
function createMenuButton() {
    // Create the button to show overlay
    const menubutton = document.createElement("button");
    menubutton.innerHTML = '<span class="menu-icon"></span>';
    menubutton.className = "menubutton";
    document.body.appendChild(menubutton);

    // Create the overlay
    const menuoverlay = document.createElement("div");
    menuoverlay.className = "overlay-container";
    document.body.appendChild(menuoverlay);

    // Create draggable handle
    const handle = document.createElement("div");
    handle.className = "overlay-handle";
    menuoverlay.appendChild(handle);

    // Create login button and add it to the overlay
    const loginButton = document.createElement("button");
    loginButton.className = "login-folder-button";
    loginButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    `;
    loginButton.id = 'LOGINBUTTON';
    loginButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openpopup" });
    });
    menuoverlay.appendChild(loginButton);

    // Create button to add new folder
    const addFolderButton = document.createElement("button");
    addFolderButton.className = "add-folder-button";
    addFolderButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
    `;
    menuoverlay.appendChild(addFolderButton);

    // Create folder container
    const folderContainer = document.createElement("div");
    folderContainer.className = "folder-container";
    menuoverlay.appendChild(folderContainer);

    // Function to render folders
    function renderFolders() {
        folderContainer.innerHTML = ""; // Clear existing folders
        
        // Create the print button (initially hidden)
        const printButton = document.createElement("button");
        printButton.className = "print-checked-button";
        printButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print Selected</span>
        `;
        printButton.style.display = "none";
        printButton.addEventListener("click", printCheckedFolders);
        folderContainer.appendChild(printButton);
        
        folders.forEach((folder, index) => {
            const folderDiv = document.createElement("div");
            folderDiv.className = "folder-item";
            folderDiv.dataset.index = index;

            // Folder header with icon
            const folderHeaderWrapper = document.createElement("div");
            folderHeaderWrapper.className = "folder-header-wrapper";
            
            // Add checkbox
            const folderCheckbox = document.createElement("input");
            folderCheckbox.type = "checkbox";
            folderCheckbox.className = "folder-checkbox";
            folderCheckbox.addEventListener("change", updatePrintButton);
            
            const folderHeader = document.createElement("div");
            folderHeader.className = "folder-header";
            folderHeader.addEventListener("click", (e) => {
                // Prevent toggling when clicking the input field or checkbox
                if (e.target.tagName !== "INPUT") {
                    toggleFolder(folderDiv, folderHeader);
                }
            });
            
            // Add folder icon
            const folderIcon = document.createElement("span");
            folderIcon.className = "folder-icon";
            folderIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
            `;
            
            // Add folder name
            const folderName = document.createElement("span");
            folderName.textContent = folder.name;
            folderName.className = "folder-name";
            
            folderHeader.appendChild(folderIcon);
            folderHeader.appendChild(folderName);

            // Options icon (three dots)
            const optionsIcon = document.createElement("span");
            optionsIcon.className = "options-icon";
            optionsIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
            `;
            optionsIcon.addEventListener("click", (e) => toggleOptionsMenu(e, folderDiv, index));

            folderHeaderWrapper.appendChild(folderCheckbox);
            folderHeaderWrapper.appendChild(folderHeader);
            folderHeaderWrapper.appendChild(optionsIcon);

            // Dropdown menu for options
            const optionsMenu = document.createElement("div");
            optionsMenu.className = "options-menu";

            const renameOption = document.createElement("div");
            renameOption.className = "options-menu-item";
            renameOption.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Rename</span>
            `;
            renameOption.addEventListener("click", () => {
                // Replace folder name with input field
                const input = document.createElement("input");
                input.type = "text";
                input.value = folder.name;
                input.className = "folder-rename-input";

                // Replace folder name with input
                folderName.textContent = "";
                folderName.appendChild(input);
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
            deleteOption.className = "options-menu-item";
            deleteOption.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                <span>Delete</span>
            `;
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
            itemList.className = "folder-item-list";

            folder.items.forEach(item => {
                const listItem = document.createElement("li");
                
                const itemIcon = document.createElement("span");
                itemIcon.className = "item-icon";
                itemIcon.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                `;
                
                const itemLink = document.createElement("a");
                itemLink.href = "https://www.google.com";
                itemLink.textContent = item;
                itemLink.className = "folder-item-link";
                itemLink.target = "_blank";

                listItem.appendChild(itemIcon);
                listItem.appendChild(itemLink);
                itemList.appendChild(listItem);
            });

            folderDiv.appendChild(folderHeaderWrapper);
            folderDiv.appendChild(itemList);
            folderContainer.appendChild(folderDiv);
        });
    }

    // Toggle folder visibility function
    function toggleFolder(folderDiv, header) {
        const itemList = folderDiv.querySelector(".folder-item-list");
        if (itemList.style.maxHeight === "0px" || itemList.style.maxHeight === "") {
            itemList.style.maxHeight = itemList.scrollHeight + "px";
            header.classList.add("folder-header-expanded");
        } else {
            itemList.style.maxHeight = "0";
            header.classList.remove("folder-header-expanded");
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
        
        // First, ensure the folder is expanded
        const folderHeader = folderDiv.querySelector(".folder-header");
        const itemList = folderDiv.querySelector(".folder-item-list");
        
        // Always expand the folder when clicking the options icon
        if (itemList.style.maxHeight === "0px" || itemList.style.maxHeight === "") {
            itemList.style.maxHeight = itemList.scrollHeight + "px";
            folderHeader.classList.add("folder-header-expanded");
        }
        
        // Then toggle the options menu
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

    // Variable to track if dragging is in progress
    let isDragging = false;

    // Add event listeners for dragging
    let startX;
    handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        menuoverlay.style.transition = "none"; // Disable transition during drag
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            const diffX = startX - e.clientX;
            let newWidth = parseInt(menuoverlay.style.width || "300") - diffX;
            if (newWidth < 200) newWidth = 200; // Minimum width
            if (newWidth > window.innerWidth - 50) newWidth = window.innerWidth - 50; // Maximum width
            menuoverlay.style.width = newWidth + "px";
            startX = e.clientX;
        }
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            menuoverlay.style.transition = "right 0.5s ease, width 0.3s ease"; // Re-enable transition
        }
    });

    // Toggle overlay on button click
    menubutton.addEventListener("click", function () {
        console.log(`menu button is clicked`);
        // Get computed style to check actual position regardless of how it was set
        const computedStyle = window.getComputedStyle(menuoverlay);
        const currentRight = parseInt(computedStyle.right);
        
        if (currentRight >= 0 || menuoverlay.style.right === "0px" || menuoverlay.style.right === "0") {
            // Ensure consistent units and handle edge cases
            menuoverlay.style.right = "-300px"; // Slide out
            console.log(`[menubutton] sliding out of screen`);
        } else {
            // Force overlay to be visible first
            menuoverlay.style.display = "block";
            // Small delay to ensure display change is processed
            setTimeout(() => {
                menuoverlay.style.right = "0px"; // Slide in with explicit units
                console.log(`[menubutton] sliding into screen`);
            }, 10);
        }
    });

    // Close overlay when clicking outside
    document.addEventListener("click", (e) => {
        if (!menuoverlay.contains(e.target) && menuoverlay.style.right === "0px" && e.target !== menubutton) {
            menuoverlay.style.right = "-300px"; // Slide out if clicked outside
        }
        // Close any open options menus
        document.querySelectorAll(".options-menu").forEach(menu => {
            menu.style.display = "none";
        });
    });

    // Add folder button functionality
    addFolderButton.addEventListener("click", () => {
        // Create a new folder with a default name
        const defaultName = "New Folder";
        const newFolder = { name: defaultName, items: [] };
        
        // Add to folders array
        folders.push(newFolder);
        
        // Render folders to update the DOM
        renderFolders();
        
        // Find the newly added folder element
        const folderElements = document.querySelectorAll(".folder-item");
        const newFolderElement = folderElements[folderElements.length - 1];
        
        if (newFolderElement) {
            const folderHeader = newFolderElement.querySelector(".folder-header");
            
            // Create input field for immediate editing
            const input = document.createElement("input");
            input.type = "text";
            input.value = defaultName;
            input.className = "folder-rename-input";
            
            // Replace header content with input
            folderHeader.textContent = "";
            folderHeader.appendChild(input);
            
            // Focus the input field
            setTimeout(() => input.focus(), 10);
            
            // Save on Enter or blur
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    saveNewName(input.value, folders.length - 1);
                    renderFolders();
                }
            });
            
            input.addEventListener("blur", () => {
                saveNewName(input.value, folders.length - 1);
                renderFolders();
            });
        }
    });
    // Initial render
    renderFolders();

    // Return the created elements for potential future reference
    return {
        menubutton,
        menuoverlay,
        handle,
        addFolderButton,
        folderContainer,
        renderFolders,
        loginButton
    };
}

// Use MutationObserver to handle dynamic DOM loading
const domObserver = new MutationObserver((mutations) => {
    if (document.body) {
        console.log("DOM ready, adding button and overlay");
        domObserver.disconnect(); // Stop observing once body is found
        
        // Call the function to create menu button and overlay
        const menuElements = createMenuButton();
    }
});

// Start observing the document for changes
domObserver.observe(document.documentElement, { childList: true, subtree: true });




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


// Function to generate and download the PDF

  // Create and style the button
function pdfmaker() {
    const button = document.createElement("button");
    button.id = "pdf-download-btn"; // Unique ID to avoid duplicates
    
    // Create PDF icon using SVG instead of text
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
    `;
  
    // Add click event to trigger PDF generation
    button.addEventListener("click", () => {
        scrollToEndAndCreatePDF();
    });

    // Append the button to the body (only if it doesn't already exist)
    if (!document.getElementById("pdf-download-btn")) {
        document.body.appendChild(button);
    }
}
  
// Execute the button creation when the script loads




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

// Function to update print button visibility
function updatePrintButton() {
    const checkedFolders = document.querySelectorAll('.folder-checkbox:checked');
    const printButton = document.querySelector('.print-checked-button');
    
    if (checkedFolders.length > 0) {
        printButton.style.display = "flex";
        printButton.querySelector('span').textContent = `Print Selected (${checkedFolders.length})`;
    } else {
        printButton.style.display = "none";
    }
}

// Function to print checked folders to console
function printCheckedFolders() {
    const checkedFolders = document.querySelectorAll('.folder-checkbox:checked');
    const selectedFolders = [];
    
    checkedFolders.forEach(checkbox => {
        const folderDiv = checkbox.closest('.folder-item');
        const index = parseInt(folderDiv.dataset.index);
        selectedFolders.push(folders[index]);
    });
    
    console.log('Selected Folders:', selectedFolders);
    alert(`Printed ${selectedFolders.length} folders to console. Check browser console.`);
}