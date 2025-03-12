console.log("Current URL from content.js:", window.location.href);
console.log("content.js loaded");


let currentChat = {
    title: "", // Default empty string
    href: ""   // Default empty string
};
let isSearchVisible = true;
let overlayActvated = false;



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
async function renderCheckboxes(customFolders = [], checkboxList) {
    let rendercheckboxresponse = await fetchFromChromeStorage();
    checkboxList.innerHTML = ""; // Clear existing checkboxes

    fetchedFolders = rendercheckboxresponse.folder_structure.chatgpt.Folders?.map(folder => folder.Folder_Name);
    fetchedFolders.push(...customFolders); // Spread operator to add multiple items
    
    // Folder icon SVG - will be used for all folders
    const folderIconSVG = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    // Array of different folder icon variations for visual variety
    const folderIcons = [
        // Standard folder
        `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        // Folder with star
        `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 15l1.5 1 .5-1.8 1.5-1.2-1.9-.3-.6-1.7-.6 1.7-1.9.3 1.5 1.2.5 1.8z" 
                fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
        </svg>`,
        // Folder with document
        `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 15v-3m-4 3v-2m0-3h4" 
                stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>`,
        // Folder with bookmark
        `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 14l-3 2-3-2V9h6v5z" 
                stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    ];
    
    // Shuffle the folders slightly for organic feel
    const shuffledFolders = [...fetchedFolders].sort(() => Math.random() - 0.45);
    
    shuffledFolders.forEach((folderName, index) => {
        const folder = { name: folderName, id: `checkbox-fixed-${index}` };
        const checkboxContainer = document.createElement("div");
        const checkbox = document.createElement("input");
        const label = document.createElement("label");
        
        // Create folder icon wrapper
        const iconWrapper = document.createElement("div");
        iconWrapper.className = "folder-icon-wrapper";
        // Select a random icon from our array for visual variety
        iconWrapper.innerHTML = folderIcons[Math.floor(Math.random() * folderIcons.length)];

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
        if (chatTitles.includes(currentChat.title)) {
            checkbox.checked = true;
            checkboxContainer.classList.add("selected");
        }

        // Add click handler for the entire container
        checkboxContainer.addEventListener("click", (e) => {
            // Don't toggle if clicking directly on the checkbox (it handles its own state)
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkboxContainer.classList.toggle("selected", checkbox.checked);
                
                // Trigger a change event on the checkbox
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            }
        });
        
        // Update selected state when checkbox changes
        checkbox.addEventListener("change", () => {
            checkboxContainer.classList.toggle("selected", checkbox.checked);
        });

        // Append elements
        checkboxContainer.appendChild(iconWrapper);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(checkbox);
        checkboxList.appendChild(checkboxContainer);
    });
}
function manageChatManagementOverlay(action) {
    let folderchoiceoverlay = document.getElementById("folderchoice-container");
    
    // Helper function to add click-outside-to-close functionality
    function addClickOutsideHandler(overlay) {
        // Remove any existing event listeners to prevent duplicates
        document.removeEventListener("click", handleClickOutside);
        // Add the event listener to the document instead of just the overlay
        document.addEventListener("click", handleClickOutside, true); // Use capture phase
        
        // Add a click handler to the message box to prevent propagation
        const messageBox = overlay.querySelector(".overlay-message-box");
        if (messageBox) {
            messageBox.removeEventListener("click", stopPropagation);
            messageBox.addEventListener("click", stopPropagation);
        }
    }
    
    // Stop event propagation
    function stopPropagation(event) {
        event.stopPropagation();
    }
    
    // Handler function for click outside
    function handleClickOutside(event) {
        // If the overlay isn't displayed, do nothing
        if (!folderchoiceoverlay || folderchoiceoverlay.style.display !== "flex") {
            return;
        }
        
        // Get references to elements
        const messageBox = folderchoiceoverlay.querySelector(".overlay-message-box");
        const menuButton = document.querySelector(".menubutton");
        
        // Check if clicked on menu button
        const isMenuButtonClick = menuButton && (menuButton === event.target || menuButton.contains(event.target));
        
        // If clicked on the message box, do nothing (let the stopPropagation handle it)
        if (messageBox && messageBox.contains(event.target) && !isMenuButtonClick) {
            return;
        }

        
        overlayActvated = false;
        folderchoiceoverlay.style.display = "none";
    }

    if (action === "show") {
        overlayActvated = true;
        fetchFromChromeStorage().then(response => {
            // console.log('[overlay] before the folder pushing', JSON.stringify(response, null, 2));
            fetchedFolders = response.folder_structure.chatgpt.Folders.map(folder => folder.Folder_Name);
            if (!folderchoiceoverlay) {
                // Create overlay
                folderchoiceoverlay = document.createElement("div");
                folderchoiceoverlay.id = "folderchoice-container";
                folderchoiceoverlay.className = "folderchoice-overlay";

                // Create message box
                const messageBox = document.createElement("div");
                messageBox.className = "overlay-message-box";

                // Add title to the overlay
                const overlayTitle = document.createElement("h2");
                overlayTitle.className = "overlay-title";
                overlayTitle.textContent = "Select Folders";
                messageBox.appendChild(overlayTitle);

                // Add folder checkbox list
                const checkboxList = document.createElement("div");
                checkboxList.className = "checkbox-list";
                messageBox.appendChild(checkboxList);
                renderCheckboxes([], checkboxList);

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
                okButton.setAttribute("aria-label", "Accept and save");
                okButton.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
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
                });
                messageBox.appendChild(okButton);

                folderchoiceoverlay.appendChild(messageBox);
                document.body.appendChild(folderchoiceoverlay);
                
                // Add click outside handler
                addClickOutsideHandler(folderchoiceoverlay);
            } else {
                // Reset checkboxes and update if overlay exists
                const checkboxList = folderchoiceoverlay.querySelector(".checkbox-list");
                const checkboxes = folderchoiceoverlay.querySelectorAll(".overlay-checkbox");
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                renderCheckboxes([], checkboxList);
                
                // Add click outside handler (in case it was removed)
                addClickOutsideHandler(folderchoiceoverlay);
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
    const menubutton = document.createElement("button");
    menubutton.innerHTML = '<span class="menu-icon"></span>';
    menubutton.className = "menubutton";
    document.body.appendChild(menubutton);
    
    // Initialize folders variable at the function scope
    let folders = [];

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
    async function renderFolders() {
        folderContainer.innerHTML = ""; // Clear existing folders
        
        // Remove any existing options menus
        document.querySelectorAll(".options-menu").forEach(menu => {
            menu.remove();
        });
        
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
        
        // Fetch the latest folder data
        try {
            const response = await fetchFromChromeStorage();
            // Update the local folders array with the latest data from storage
            folders = response.folder_structure.chatgpt.Folders || [];
            console.log('[renderFolders] fetched folders:', folders);
            
            // If no folders exist, show a message
            if (!folders || folders.length === 0) {
                const emptyMessage = document.createElement("div");
                emptyMessage.className = "empty-folders-message";
                emptyMessage.textContent = "No folders available. Click the + button to create one.";
                emptyMessage.style.color = "rgba(255, 255, 255, 0.6)";
                emptyMessage.style.textAlign = "center";
                emptyMessage.style.padding = "20px";
                emptyMessage.style.fontStyle = "italic";
                folderContainer.appendChild(emptyMessage);
                return;
            }
            
            // Render each folder
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
                folderName.textContent = folder.Folder_Name;
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
                optionsMenu.dataset.folderIndex = index; // Store the folder index
                
                // Don't set any initial positioning - it will be set dynamically when opened
                document.body.appendChild(optionsMenu); // Append to body instead of folder

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
                    // Get the folder header for this folder
                    const folderHeader = document.querySelector(`.folder-item[data-index="${index}"] .folder-header`);
                    const folderName = folderHeader.querySelector(".folder-name");
                    
                    // Replace folder name with input field
                    const input = document.createElement("input");
                    input.type = "text";
                    // Use Folder_Name property instead of name for consistency
                    input.value = folder.Folder_Name || folder.name;
                    input.className = "folder-rename-input";
                    
                    // Add a container for the input to maintain styling
                    const inputContainer = document.createElement("div");
                    inputContainer.className = "folder-rename-container";
                    inputContainer.style.flex = "1";
                    inputContainer.style.display = "flex";
                    inputContainer.style.alignItems = "center";
                    
                    // Replace folder name with input
                    folderName.textContent = "";
                    inputContainer.appendChild(input);
                    folderName.appendChild(inputContainer);
                    
                    // Add a subtle animation
                    input.style.opacity = "0";
                    input.style.transform = "translateY(5px)";
                    setTimeout(() => {
                        input.style.transition = "opacity 0.2s ease, transform 0.2s ease";
                        input.style.opacity = "1";
                        input.style.transform = "translateY(0)";
                    }, 10);
                    
                    input.focus();

                    // Save on Enter or blur
                    input.addEventListener("keydown", async (e) => {
                        if (e.key === "Enter") {
                            await saveNewName(input.value, index);
                            renderFolders();
                        } else if (e.key === "Escape") {
                            // Cancel rename on Escape
                            renderFolders();
                        }
                    });
                    
                    input.addEventListener("blur", async () => {
                        await saveNewName(input.value, index);
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
                deleteOption.addEventListener("click", async () => {
                    // Delete the folder from local array
                    folders.splice(index, 1);
                    
                    // Save changes to Chrome storage
                    try {
                        const response = await fetchFromChromeStorage();
                        // Remove the folder at the same index from the storage
                        if (index < response.folder_structure.chatgpt.Folders.length) {
                            response.folder_structure.chatgpt.Folders.splice(index, 1);
                        }
                        await chrome.storage.sync.set(response);
                        console.log('[deleteFolder] Saved updated folders to Chrome storage after deletion');
                    } catch (error) {
                        console.error('[deleteFolder] Error saving after folder deletion:', error);
                    }
                    
                    renderFolders();
                    optionsMenu.style.display = "none";
                });

                optionsMenu.appendChild(renameOption);
                optionsMenu.appendChild(deleteOption);
                folderDiv.appendChild(optionsMenu);

                const itemList = document.createElement("ul");
                itemList.className = "folder-item-list";
                itemList.style.maxHeight = "0"; // Ensure initial state is collapsed
                
                // console.log('[renderFolders] folder', folder);
                if (folder.Chats && folder.Chats.length > 0) {
                    folder.Chats.forEach(item => {
                        console.log(`[renderFolders] ${folder.Folder_Name} item`, item);
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
                        itemLink.href = item.href;
                        itemLink.textContent = item.title;
                        itemLink.className = "folder-item-link";
                        itemLink.target = "_blank";

                        listItem.appendChild(itemIcon);
                        listItem.appendChild(itemLink);
                        itemList.appendChild(listItem);
                    });
                } else {
                    // Create an empty state message for folders with no items
                    const emptyStateItem = document.createElement("li");
                    emptyStateItem.className = "empty-folder-message";
                    emptyStateItem.innerHTML = `
                        <span class="empty-folder-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="8" y1="12" x2="16" y2="12"/>
                            </svg>
                        </span>
                        <span>No items in this folder</span>
                    `;
                    itemList.appendChild(emptyStateItem);
                }

                folderDiv.appendChild(folderHeaderWrapper);
                folderDiv.appendChild(itemList);
                folderContainer.appendChild(folderDiv);
            });
        } catch (error) {
            console.error('[renderFolders] Error fetching folders:', error);
        }
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
    async function saveNewName(newName, index) {
        if (newName.trim()) {
            // Update the local folders array
            folders[index].name = newName.trim();
            folders[index].Folder_Name = newName.trim(); // Update Folder_Name property as well
            
            // Save changes to Chrome storage
            try {
                const response = await fetchFromChromeStorage();
                // Instead of replacing the entire folders array, update just the specific folder
                const existingFolders = response.folder_structure.chatgpt.Folders;
                
                // Find the folder with the same index or matching properties
                if (index < existingFolders.length) {
                    existingFolders[index].name = newName.trim();
                    existingFolders[index].Folder_Name = newName.trim();
                }
                
                // Save back to Chrome storage
                await chrome.storage.sync.set(response);
                console.log('[saveNewName] Saved updated folder name to Chrome storage');
            } catch (error) {
                console.error('[saveNewName] Error saving folder name:', error);
            }
        }
    }

    // Toggle options menu
    function toggleOptionsMenu(e, folderDiv, index) {
        e.stopPropagation(); // Prevent folder collapse/expand
        
        // Get the options menu for this folder
        const optionsMenu = document.querySelector(`.options-menu[data-folder-index="${index}"]`);
        
        // If the menu is already open, close it
        if (optionsMenu.style.display === "block") {
            optionsMenu.style.display = "none";
            return;
        }
        
        // Close any other open menus first
        document.querySelectorAll(".options-menu").forEach(menu => {
            menu.style.display = "none";
        });
        
        // Get the position of the clicked options icon
        const optionsIcon = e.currentTarget;
        const iconRect = optionsIcon.getBoundingClientRect();
        
        // Position the menu next to the options icon
        // Use fixed positioning with coordinates relative to the viewport
        optionsMenu.style.top = `${iconRect.bottom + 5}px`;
        optionsMenu.style.left = `${iconRect.left - 120}px`; // Position to the left of the icon
        
        // Show the menu
        optionsMenu.style.display = "block";
        
        // Check if the menu extends beyond the viewport boundaries and adjust if needed
        setTimeout(() => {
            const menuRect = optionsMenu.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Adjust vertical position if needed
            if (menuRect.bottom > viewportHeight) {
                optionsMenu.style.top = `${iconRect.top - menuRect.height - 5}px`;
            }
            
            // Adjust horizontal position if needed
            if (menuRect.left < 0) {
                optionsMenu.style.left = `${iconRect.right + 5}px`;
            } else if (menuRect.right > viewportWidth) {
                optionsMenu.style.left = `${iconRect.left - menuRect.width - 5}px`;
            }
        }, 0);
        
        // Add a click event listener to the document to close the menu when clicking outside
        const closeMenuOnClickOutside = (event) => {
            if (!optionsMenu.contains(event.target) && event.target !== optionsIcon) {
                optionsMenu.style.display = "none";
                document.removeEventListener("click", closeMenuOnClickOutside);
            }
        };
        
        // Use setTimeout to avoid immediate triggering of the event
        setTimeout(() => {
            document.addEventListener("click", closeMenuOnClickOutside);
        }, 0);
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
    menubutton.addEventListener("click", async function () {
        console.log(`menu button is clicked`);
        
        // Close folder choice overlay if it's open
        const folderchoiceoverlay = document.getElementById("folderchoice-container");
        if (folderchoiceoverlay && folderchoiceoverlay.style.display === "flex") {
            console.log("Menu button clicked - closing folder choice overlay");
            folderchoiceoverlay.style.display = "none";
            overlayActvated = false;
            return; // Exit early to prevent menu overlay toggle
        }
        
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
            
            // Refresh folder data before showing the overlay
            try {
                // No need to manually update folders here, renderFolders will handle it
                await renderFolders(); // Re-render folders with updated data
            } catch (error) {
                console.error('[menubutton] Error refreshing folders:', error);
            }
            
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

    // Function to generate a random folder name
    function generateRandomFolderName() {
        const adjectives = [
            "Amazing", "Brilliant", "Creative", "Dynamic", "Elegant", 
            "Fantastic", "Gorgeous", "Helpful", "Innovative", "Joyful", 
            "Knowledgeable", "Luminous", "Magical", "Notable", "Optimal", 
            "Powerful", "Quick", "Radiant", "Stellar", "Thoughtful", 
            "Unique", "Vibrant", "Wonderful", "Xenial", "Zealous"
        ];
        
        const nouns = [
            "Archive", "Briefcase", "Collection", "Documents", "Essays", 
            "Files", "Gallery", "Hub", "Ideas", "Journal", 
            "Knowledge", "Library", "Memos", "Notes", "Organizer", 
            "Portfolio", "Queries", "Records", "Storage", "Thoughts", 
            "Universe", "Vault", "Workspace", "Xanadu", "Zone"
        ];
        
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${randomAdjective} ${randomNoun}`;
    }

    // Add folder button functionality
    addFolderButton.addEventListener("click", async () => {
        // Create a new folder with a random name
        const randomName = generateRandomFolderName();
        const newFolder = { 
            name: randomName, 
            Folder_Name: randomName, 
            items: [], 
            Chats: [] 
        }; // Ensure all properties exist
        
        // Add to local folders array
        folders.push(newFolder);
        
        // Save changes to Chrome storage
        try {
            const response = await fetchFromChromeStorage();
            // Add the new folder to the existing folders in storage
            response.folder_structure.chatgpt.Folders.push(newFolder);
            await chrome.storage.sync.set(response);
            console.log('[addFolder] Saved updated folders to Chrome storage after adding new folder');
        } catch (error) {
            console.error('[addFolder] Error saving after adding folder:', error);
        }
        
        // Render folders to update the DOM
        renderFolders();
        
        // Find the newly added folder element
        const folderElements = document.querySelectorAll(".folder-item");
        const newFolderElement = folderElements[folderElements.length - 1];
        
        if (newFolderElement) {
            const folderHeader = newFolderElement.querySelector(".folder-header");
            const folderName = folderHeader.querySelector(".folder-name");
            
            // Create input field for immediate editing
            const input = document.createElement("input");
            input.type = "text";
            input.value = randomName;
            input.className = "folder-rename-input";
            
            // Add a container for the input to maintain styling
            const inputContainer = document.createElement("div");
            inputContainer.className = "folder-rename-container";
            inputContainer.style.flex = "1";
            inputContainer.style.display = "flex";
            inputContainer.style.alignItems = "center";
            
            // Replace folder name with input
            folderName.textContent = "";
            inputContainer.appendChild(input);
            folderName.appendChild(inputContainer);
            
            // Add a subtle animation
            input.style.opacity = "0";
            input.style.transform = "translateY(5px)";
            setTimeout(() => {
                input.style.transition = "opacity 0.2s ease, transform 0.2s ease";
                input.style.opacity = "1";
                input.style.transform = "translateY(0)";
                input.focus();
            }, 10);
            
            // Save on Enter or blur
            input.addEventListener("keydown", async (e) => {
                if (e.key === "Enter") {
                    await saveNewName(input.value, folders.length - 1);
                    renderFolders();
                } else if (e.key === "Escape") {
                    // Cancel rename on Escape
                    renderFolders();
                }
            });
            
            input.addEventListener("blur", async () => {
                await saveNewName(input.value, folders.length - 1);
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
        console.log('[printCheckedFolders] checkbox printing is not implemented yet properly', checkbox);
    });
    
    

}