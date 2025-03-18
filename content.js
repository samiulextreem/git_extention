// content.js - Main functionality for the Chrome extension
console.log("Content script loaded on:", window.location.href);

// Configuration
const CONFIG = {
    // API_BASE_URL will be set dynamically from the config
    API_BASE_URL: null,
    STORAGE_KEYS: {
        USER_EMAIL: 'useremail',
        IS_PREMIUM: 'isPremium',
        PRODUCT_INFO: 'productInfo',
        APP_CONFIG: 'appConfig'
    }
};

// State management
const state = {
    isPremium: false,
    isLoggedIn: false,
    userEmail: null
};

// Initialize the extension based on current URL
async function initializeExtension() {
    // Load API URL from configuration
    await loadApiUrl();
    
    if (!window.location.href.includes("chatgpt.com")) {
        showButtonOnTextSelection();
    }
    
    // Load user data from storage
    loadUserData();
}

/**
 * Load API URL from configuration
 */
async function loadApiUrl() {
    try {
        // First try to get from storage
        const result = await chrome.storage.sync.get(CONFIG.STORAGE_KEYS.APP_CONFIG);
        const appConfig = result[CONFIG.STORAGE_KEYS.APP_CONFIG];
        
        if (appConfig && appConfig.apiUrl) {
            // Remove trailing slash if present
            CONFIG.API_BASE_URL = appConfig.apiUrl.replace(/\/$/, '');
            console.log('API URL loaded from storage:', CONFIG.API_BASE_URL);
            return;
        }
        
        // If not in storage, request from background script
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getApiUrl' }, (response) => {
                resolve(response);
            });
        });
        
        if (response && response.apiUrl) {
            // Remove trailing slash if present
            CONFIG.API_BASE_URL = response.apiUrl.replace(/\/$/, '');
            console.log('API URL loaded from background:', CONFIG.API_BASE_URL);
        } else {
            // Fallback to default URL if not found
            CONFIG.API_BASE_URL = 'https://31e4-2-40-40-33.ngrok-free.app';
            console.warn('Failed to load API URL from config, using fallback');
        }
    } catch (error) {
        console.error('Error loading API URL:', error);
        // Fallback to default URL
        CONFIG.API_BASE_URL = 'https://31e4-2-40-40-33.ngrok-free.app';
    }
}

// Load user data from Chrome storage
async function loadUserData() {
    try {
        const result = await chrome.storage.sync.get(CONFIG.STORAGE_KEYS.USER_EMAIL);
        
        if (result[CONFIG.STORAGE_KEYS.USER_EMAIL]) {
            state.userEmail = result[CONFIG.STORAGE_KEYS.USER_EMAIL];
            state.isLoggedIn = true;
            
            console.log("User email loaded:", state.userEmail);
            
            // Verify payment status
            await verifyPayment(state.userEmail);
        } else {
            console.log("No user email found in storage");
            state.isLoggedIn = false;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Helper function to verify payment with the backend
async function verifyPayment(userEmail) {
    if (!userEmail) {
        console.log('Cannot verify payment: userEmail is null or empty');
        return Promise.reject('No email provided');
    }
    
    console.log('Verifying payment for:', userEmail);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/verify-payment?email=${encodeURIComponent(userEmail)}`);
        
        if (!response.ok) {
            throw new Error(`Network response error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Payment status checked:', data);
        
        // Handle the expected JSON structure with 'success' and 'product_info' fields
        if (data && typeof data.success !== 'undefined') {
            state.isPremium = data.success;
            
            // Log product info if available
            if (data.product_info) {
                console.log('Product info:', data.product_info);
            }
            
            // Update the premium status in local storage
            await updatePremiumStatus(state.isPremium, data.product_info || {});
            
            // Update UI based on premium status
            updateUIForPremiumStatus();
        } else {
            console.warn('Unexpected response format:', data);
            state.isPremium = false;
        }
        
        return data;
    } catch (error) {
        console.error('Error checking payment status:', error);
        return {success: false, product_info: null}; // Return default value on error
    }
}

// Update premium status in storage
async function updatePremiumStatus(isPremium, productInfo) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({
            [CONFIG.STORAGE_KEYS.IS_PREMIUM]: isPremium,
            [CONFIG.STORAGE_KEYS.PRODUCT_INFO]: productInfo
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving premium status:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Premium status saved to storage:', isPremium);
                resolve();
            }
        });
    });
}

// Update UI elements based on premium status
function updateUIForPremiumStatus() {
    const adBanner = document.querySelector('.ad-banner-container');
    if (adBanner) {
        if (state.isPremium) {
            adBanner.style.display = 'none';
            console.log('User is premium, hiding ads');
        } else {
            adBanner.style.display = 'flex';
            console.log('User is not premium, showing ads');
        }
    }
}

// Listen for changes to the premium status
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        // Handle premium status changes
        if (changes[CONFIG.STORAGE_KEYS.IS_PREMIUM]) {
            const isPremium = changes[CONFIG.STORAGE_KEYS.IS_PREMIUM].newValue;
            state.isPremium = isPremium; // Update the state
            console.log('Premium status changed:', isPremium);
            
            // Update UI based on premium status
            updateUIForPremiumStatus();
        }
    }
});

// Initialize the extension
initializeExtension();

let currentChat = {
    title: "", // Default empty string
    href: ""   // Default empty string
};
let isSearchVisible = true;
let overlayActvated = false;



manageConversationButtonsAndTitles();
pdfmaker();


function loginchecker(){
    return new Promise((resolve) => {
        chrome.storage.sync.get(null, (result) => {
            if (result.useremail) {
                console.log("Email found in sync storage: ", result.useremail);
                resolve(true);
            } else {
                console.log("No email field exists in chrome.storage.sync");
                resolve(false);
            }
        });
    });
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
            //console.log("[Overlay] folder structure not found. Pushed default folders:", defaultFolders);
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
        // Find the actual folder object to get its color
        const folderObject = rendercheckboxresponse.folder_structure.chatgpt.Folders.find(
            f => f.Folder_Name === folderName
        );
        
        const folder = { 
            name: folderName, 
            id: `checkbox-fixed-${index}`,
            color: folderObject?.color || ""
        };
        
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
        
        // Create the checkbox item container
        checkboxContainer.className = "checkbox-item";
        checkboxContainer.setAttribute("data-folder-name", folder.name);
        
        // Apply color if the folder has one
        if (folder.color) {
            applyCheckboxItemColor(checkboxContainer, folder.color);
        }
        
        // Add color button
        const colorButton = document.createElement("button");
        colorButton.className = "checkbox-color-btn";
        colorButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="8" cy="8" r="2" fill="rgba(66, 153, 225, 0.8)" stroke="none" />
                <circle cx="16" cy="8" r="2" fill="rgba(245, 101, 101, 0.8)" stroke="none" />
                <circle cx="8" cy="16" r="2" fill="rgba(72, 187, 120, 0.8)" stroke="none" />
                <circle cx="16" cy="16" r="2" fill="rgba(237, 137, 54, 0.8)" stroke="none" />
            </svg>
        `;
        
        // Add tooltip to color button
        colorButton.title = folder.color ? "Change folder color" : "Add folder color";
        
        // Add event listener to color button
        colorButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent checkbox from being toggled
            showColorPicker(checkboxContainer, null, folder.color, folder.name);
        });
        
        label.htmlFor = folder.id;
        label.className = "checkbox-label";
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
        checkboxContainer.appendChild(colorButton);
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
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/get_auth_status?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('[checkAuthStatus]  data', data);
        
        if (data.authenticated == true){
            console.log('log in successful', data.authenticated);
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






chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "pullDataFromChromeStorage") {
        pullDataFromChromeStorage();
    }

    if (request.action === "updateloginevent") {
        console.log('updateloginevent', request.data);
        showNotification('welcome back '+request.data);
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        // Update login state and refresh UI

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

    // Add banner ad container at the bottom of the overlay
    const adBannerContainer = document.createElement("div");
    adBannerContainer.className = "ad-banner-container";
    adBannerContainer.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 90px;
        background-color: rgba(30, 32, 35, 0.9);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        box-sizing: border-box;
        z-index: 10003;
    `;
    
    // Add placeholder content for the ad
    adBannerContainer.innerHTML = `
        <div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(66, 153, 225, 0.2), rgba(99, 102, 241, 0.2)); 
                    border-radius: 8px; display: flex; align-items: center; justify-content: center; 
                    border: 1px dashed rgba(255, 255, 255, 0.3);">
            <span style="color: rgba(255, 255, 255, 0.7); font-size: 14px; text-align: center;">
                Advertisement Banner
            </span>
        </div>
    `;
    
    // First check the ispaiduser variable (which might be set already)
    if (state.isPremium) {
        adBannerContainer.style.display = 'none';
        console.log('User is premium (from variable), hiding ad banner on initialization');
    } else {
        // If not set, check storage as a fallback
        chrome.storage.local.get([CONFIG.STORAGE_KEYS.IS_PREMIUM, CONFIG.STORAGE_KEYS.PRODUCT_INFO], function(result) {
            if (result[CONFIG.STORAGE_KEYS.IS_PREMIUM]) {
                // User is premium, hide the ad banner
                adBannerContainer.style.display = 'none';
                state.isPremium = true; // Update the state to match storage
                
                // Log product info if available
                if (result[CONFIG.STORAGE_KEYS.PRODUCT_INFO]) {
                    console.log('Product info from storage:', result[CONFIG.STORAGE_KEYS.PRODUCT_INFO]);
                }
                
                console.log('User is premium (from storage), hiding ad banner on initialization');
            } else {
                // User is not premium, show the ad banner
                adBannerContainer.style.display = 'flex';
                console.log('User is not premium, showing ad banner on initialization');
            }
        });
    }
    
    menuoverlay.appendChild(adBannerContainer);

    // Add styles for the coming soon message
    const style = document.createElement('style');
    style.textContent = `
        .folder-container-message {
            padding: 20px;
            text-align: center;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 150px; /* Increased from 100px to 150px */
            width: 100%;
            box-sizing: border-box;
        }
        
        .coming-soon-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px; /* Reduced from 16px */
            padding: 20px; /* Reduced from 24px */
            background: rgba(255, 255, 255, 0.03); /* More subtle background */
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08); /* More subtle border */
            max-width: 85%; /* Slightly reduced from 90% */
            margin: 0 auto;
            backdrop-filter: blur(8px); /* Add blur effect for premium look */
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Subtle shadow */
        }
        
        .coming-soon-message svg {
            color: rgba(255, 255, 255, 0.5); /* More subtle icon */
            width: 40px; /* Reduced from 48px */
            height: 40px; /* Reduced from 48px */
        }
        
        .coming-soon-message h3 {
            margin: 0;
            font-size: 16px; /* Reduced from 18px */
            font-weight: 500; /* Reduced from 600 */
            color: rgba(255, 255, 255, 0.85);
            letter-spacing: 0.3px; /* Added letter spacing */
            text-transform: uppercase; /* Make it uppercase */
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* Premium font stack */
        }
        
        .coming-soon-message p {
            margin: 0;
            font-size: 13px; /* Reduced from 14px */
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.4; /* Reduced from 1.5 */
            letter-spacing: 0.2px; /* Added letter spacing */
            font-weight: 400;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* Premium font stack */
        }
    `;
    document.head.appendChild(style);

    // Create draggable handle
    const handle = document.createElement("div");
    handle.className = "overlay-handle";
    menuoverlay.appendChild(handle);

    // Create a button container for all buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "row";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginBottom = "15px";
    menuoverlay.appendChild(buttonContainer);

    // Create login button and add it to the button container
    const loginButton = document.createElement("button");
    loginButton.className = "login-folder-button";
    loginButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    `;
    loginButton.id = 'LOGINBUTTON';
    loginButton.title = "Login";
    loginButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openpopup" });
    });
    buttonContainer.appendChild(loginButton);

    // Create settings button
    const settingsButton = document.createElement("button");
    settingsButton.className = "settings-button";
    settingsButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    `;
    settingsButton.id = 'SETTINGSBUTTON';
    settingsButton.title = "Settings";
    settingsButton.addEventListener("click", () => {
        console.log("Settings button clicked");
    });
    buttonContainer.appendChild(settingsButton);

    // Create money/payment button
    const moneyButton = document.createElement("button");
    moneyButton.className = "money-button";
    moneyButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="6" x2="12" y2="12"></line>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <path d="M9.5 9.5c0-1.1.9-2 2-2h1c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2h-1c-1.1 0-2 .9-2 2v0c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2"></path>
        </svg>
    `;
    moneyButton.id = 'MONEYBUTTON';
    moneyButton.title = "Payments";
    moneyButton.addEventListener("click", () => {
        // Check if user is logged in before showing product selection
        loginchecker().then(isLoggedIn => {
            if (isLoggedIn) {
                // User is logged in, show product selection overlay
                showProductSelectionOverlay();
            } else {
                // User is not logged in, show login popup
                showNotification("Please log in to access premium features");
                chrome.runtime.sendMessage({ action: "openpopup" });
            }
        });
    });
    buttonContainer.appendChild(moneyButton);

    // Create button to add new folder and add it to the button container
    const addFolderButton = document.createElement("button");
    addFolderButton.className = "add-folder-button";
    addFolderButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
    `;
    buttonContainer.appendChild(addFolderButton);

    // Create folder container
    const folderContainer = document.createElement("div");
    folderContainer.className = "folder-container";

    // Check if we're on chatgpt.com
    if (!window.location.href.includes("chatgpt.com")) {
        // Create a message container for non-chatgpt sites
        const messageContainer = document.createElement("div");
        messageContainer.className = "folder-container-message";
        messageContainer.innerHTML = `
            <div class="coming-soon-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M2 12h20"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <h3>Foldering conversations only available for ChatGPT</h3>
                <p>Coming soon for Anthropic, Grok, and many more!</p>
            </div>
        `;
        menuoverlay.appendChild(messageContainer);
    } else {
        // Add the regular folder container for chatgpt.com
        menuoverlay.appendChild(folderContainer);
    }

    // Function to render folders
    async function renderFolders() {
        folderContainer.innerHTML = ""; // Clear existing folders
        
        // Remove any existing options menus
        document.querySelectorAll(".options-menu").forEach(menu => {
            menu.remove();
        });
        
        // Fetch the latest folder data
        try {
            const response = await fetchFromChromeStorage();
            // Update the local folders array with the latest data from storage
            folders = response.folder_structure.chatgpt.Folders || [];
            // console.log('[renderFolders] fetched folders:', folders);
            
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
            
            const folderHeader = document.createElement("div");
            folderHeader.className = "folder-header";
            folderHeader.addEventListener("click", (e) => {
                    // Prevent toggling when clicking the input field
                if (e.target.tagName !== "INPUT") {
                    toggleFolder(folderDiv, folderHeader);
                }
            });
  
            // Add folder icon
            const folderIcon = document.createElement("span");
            folderIcon.className = "folder-icon";
            
            // Get chat count for the folder
            const chatCount = folder.Chats ? folder.Chats.length : 0;
            
            // Create SVG with count badge if there are items
            folderIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="folder-svg">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                ${chatCount > 0 ? `<span class="folder-icon-count">${chatCount}</span>` : ''}
            `;
            
            // Add folder name
            const folderName = document.createElement("span");
                folderName.textContent = folder.Folder_Name;
            folderName.className = "folder-name";
            
            // We'll remove the separate item count badge since it's now part of the icon
            
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

                // Add color option
                const colorOption = document.createElement("div");
                colorOption.className = "options-menu-item";
                
                // Show the current color in the menu item if it exists
                const currentColor = folder.color || "";
                const colorPreview = currentColor ? 
                    `<span class="color-preview" style="background-color: ${currentColor}"></span>` : 
                    '';
                
                colorOption.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="8" cy="8" r="2" fill="rgba(66, 153, 225, 0.8)" stroke="none" />
                        <circle cx="16" cy="8" r="2" fill="rgba(245, 101, 101, 0.8)" stroke="none" />
                        <circle cx="8" cy="16" r="2" fill="rgba(72, 187, 120, 0.8)" stroke="none" />
                        <circle cx="16" cy="16" r="2" fill="rgba(237, 137, 54, 0.8)" stroke="none" />
                    </svg>
                    ${colorPreview}
                    <span>${currentColor ? 'Change Color' : 'Add Color'}</span>
                `;
                colorOption.addEventListener("click", () => {
                    showColorPicker(folderDiv, index, currentColor);
                    optionsMenu.style.display = "none";
                });
                optionsMenu.appendChild(colorOption);

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
            optionsMenu.appendChild(colorOption);
            optionsMenu.appendChild(deleteOption);
            folderDiv.appendChild(optionsMenu);

            const itemList = document.createElement("ul");
            itemList.className = "folder-item-list";
                itemList.style.maxHeight = "0"; // Ensure initial state is collapsed

                // console.log('[renderFolders] folder', folder);
                if (folder.Chats && folder.Chats.length > 0) {
                    folder.Chats.forEach(item => {
                        // console.log(`[renderFolders] ${folder.Folder_Name} item`, item);
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
                
                // Apply saved color if it exists
                if (folder.color) {
                    applyFolderColor(folderDiv, folder.color);
                    
                    // Log color application for debugging
                    //console.log(`[renderFolders] Applied color ${folder.color} to folder "${folder.Folder_Name}"`);
                }
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
        // console.log(`menu button is clicked`);
        
        // Close folder choice overlay if it's open
        const folderchoiceoverlay = document.getElementById("folderchoice-container");
        if (folderchoiceoverlay && folderchoiceoverlay.style.display === "flex") {
            // console.log("Menu button clicked - closing folder choice overlay");
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
            // console.log(`[menubutton] sliding out of screen`);
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
                // console.log(`[menubutton] sliding into screen`);
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
            Chats: [],
            color: "" 
        }; // Ensure all properties exist
        
        // Add to local folders array
        folders.push(newFolder);
        
        // Save changes to Chrome storage
        try {
            const response = await fetchFromChromeStorage();
            console.log('[addFolder] just before foler creation', response.folder_structure.chatgpt.Folders);
            // Add the new folder to the existing folders in storage
            response.folder_structure.chatgpt.Folders.push(newFolder);
            console.log('[addFolder] just after foler creation', response.folder_structure.chatgpt.Folders);
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
const dommenubuttoncreator = new MutationObserver((mutations) => {
    if (document.body) {
        console.log("DOM ready, adding button and overlay");
        dommenubuttoncreator.disconnect(); // Stop observing once body is found
        
        // Use the Promise-based loginchecker and handle the result properly
        loginchecker().then(isLoggedInResult => {
            state.isLoggedIn = isLoggedInResult;
            if (state.isLoggedIn == true){
                // Call the function to create menu button and overlay
                const menuElements = createMenuButton();
            }
            else{
                console.log("User is not logged in, not creating menu button and overlay");
                
                // Create a login button with the same style as menubutton
                const loginButton = document.createElement("button");
                loginButton.innerHTML = `
                    <span class="menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </span>
                `;
                loginButton.className = "menubutton";
                loginButton.title = "Login to access folders";
                
                // Add click event to open login popup
                loginButton.addEventListener("click", () => {
                    chrome.runtime.sendMessage({ action: "openpopup" });
                });
                
                document.body.appendChild(loginButton);
            }
        });
    }
});



// Use MutationObserver to handle dynamic DOM loading
const domwatcherforaskbox = new MutationObserver((mutations) => {
  if (document.body) {
    // console.log("Document body found, adding mousemove listener");

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
            } else {
                hideFlexSection();
            }
            // Replace absolute position logging with percentages
            // const yPercent = ((mouseY / window.innerHeight) * 100).toFixed(2);
            // const xPercent = ((mouseX / window.innerWidth) * 100).toFixed(2);
            // console.log(`[mouseobserver] Vertical: ${yPercent}%, Horizontal: ${xPercent}%`);
        }


    });
  }
});


// Function to print checked folders to console
function printCheckedFolders() {
    const checkedFolders = document.querySelectorAll('.folder-checkbox:checked');
    const selectedFolders = [];
    
    checkedFolders.forEach(checkbox => {
        console.log('[printCheckedFolders] checkbox printing is not implemented yet properly', checkbox);
    });
    
    

}

// Function to show color picker for a folder
function showColorPicker(folderDiv, index, folderColor = "", folderName = null) {
    // Create color picker container
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.className = "color-picker-container";
    
    // Define a set of colors to choose from, organized by color groups
    const colorGroups = [
        {
            name: "Blues",
            colors: [
                { name: "Sky Blue", value: "rgba(66, 153, 225, 0.6)" },
                { name: "Royal Blue", value: "rgba(49, 130, 206, 0.6)" },
                { name: "Navy Blue", value: "rgba(44, 82, 130, 0.6)" }
            ]
        },
        {
            name: "Greens",
            colors: [
                { name: "Mint Green", value: "rgba(72, 187, 120, 0.6)" },
                { name: "Forest Green", value: "rgba(39, 103, 73, 0.6)" },
                { name: "Teal", value: "rgba(56, 178, 172, 0.6)" }
            ]
        },
        {
            name: "Warm Colors",
            colors: [
                { name: "Red", value: "rgba(245, 101, 101, 0.6)" },
                { name: "Orange", value: "rgba(237, 137, 54, 0.6)" },
                { name: "Yellow", value: "rgba(236, 201, 75, 0.6)" }
            ]
        },
        {
            name: "Purple & Pink",
            colors: [
                { name: "Lavender", value: "rgba(159, 122, 234, 0.6)" },
                { name: "Purple", value: "rgba(128, 90, 213, 0.6)" },
                { name: "Pink", value: "rgba(237, 100, 166, 0.6)" }
            ]
        }
    ];
    
    // Add a default/reset option
    const defaultOption = { name: "Default", value: "" };
    
    // Get current folder color - use the passed parameter instead of accessing folders
    const currentColor = folderColor || "";
    
    // Create title for the color picker
    const title = document.createElement("div");
    title.className = "color-picker-title";
    title.textContent = folderName ? `Color for "${folderName}"` : "Select a color";
    colorPickerContainer.appendChild(title);
    
    // Create color swatches container
    const swatchesContainer = document.createElement("div");
    swatchesContainer.className = "color-swatches";
    
    // Add all color groups
    colorGroups.forEach(group => {
        group.colors.forEach(color => {
            addColorSwatch(color, currentColor);
        });
    });
    
    // Add default option at the end
    addColorSwatch(defaultOption, currentColor);
    
    colorPickerContainer.appendChild(swatchesContainer);
    
    // Helper function to add a color swatch
    function addColorSwatch(color, currentColor) {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = color.value || "rgba(255, 255, 255, 0.05)";
        swatch.title = color.name;
        
        // Show checkmark on currently selected color
        if (color.value === currentColor) {
            swatch.classList.add("selected");
            swatch.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else if (color.name === "Default" && !currentColor) {
            swatch.classList.add("selected");
            swatch.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else if (color.name === "Default") {
            swatch.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            `;
        }
        
        swatch.addEventListener("click", async () => {
            let success;
            
            if (folderName) {
                // For checkbox overlay
                success = await saveFolderColor(null, color.value, folderName);
                if (success) {
                    // Apply color to the checkbox item
                    applyCheckboxItemColor(folderDiv, color.value);
                }
            } else {
                // For folder management overlay
                success = await saveFolderColor(index, color.value);
                if (success) {
                    // Apply color to the folder
                    applyFolderColor(folderDiv, color.value);
                }
            }
            
            colorPickerContainer.remove();
        });
        
        swatchesContainer.appendChild(swatch);
    }
    
    // Add close button
    const closeButton = document.createElement("button");
    closeButton.className = "color-picker-close";
    closeButton.innerHTML = "Cancel";
    closeButton.addEventListener("click", () => {
        colorPickerContainer.remove();
    });
    colorPickerContainer.appendChild(closeButton);
    
    // Position the color picker near the folder
    const folderRect = folderDiv.getBoundingClientRect();
    colorPickerContainer.style.position = "fixed";
    colorPickerContainer.style.top = `${folderRect.top + window.scrollY}px`;
    colorPickerContainer.style.left = `${folderRect.right + 10}px`;
    
    // Check if the color picker would go off-screen and adjust if needed
    setTimeout(() => {
        const pickerRect = colorPickerContainer.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (pickerRect.right > viewportWidth - 20) {
            colorPickerContainer.style.left = `${folderRect.left - pickerRect.width - 10}px`;
        }
        
        if (pickerRect.bottom > viewportHeight - 20) {
            colorPickerContainer.style.top = `${Math.max(20, folderRect.bottom - pickerRect.height)}px`;
        }
    }, 0);
    
    // Add to document
    document.body.appendChild(colorPickerContainer);
    
    // Add click outside handler to close the picker
    setTimeout(() => {
        const closePickerOnClickOutside = (event) => {
            if (!colorPickerContainer.contains(event.target)) {
                colorPickerContainer.remove();
                document.removeEventListener("click", closePickerOnClickOutside);
            }
        };
        document.addEventListener("click", closePickerOnClickOutside);
    }, 10);
}

// Function to save folder color to Chrome storage
async function saveFolderColor(index, colorValue, folderName = null) {
    // If we're in the checkbox overlay (folderName is provided), we need to find the folder by name
    // If we're in the folder management overlay, we can use the index directly
    
    try {
        const response = await fetchFromChromeStorage();
        const existingFolders = response.folder_structure.chatgpt.Folders;
        
        if (folderName) {
            // Find the folder by name (for checkbox overlay)
            const folderIndex = existingFolders.findIndex(f => f.Folder_Name === folderName);
            if (folderIndex !== -1) {
                existingFolders[folderIndex].color = colorValue;
                console.log(`[saveFolderColor] Updated color for folder "${folderName}" to ${colorValue}`);
            } else {
                console.error(`[saveFolderColor] Could not find folder with name "${folderName}"`);
                return false;
            }
        } else if (index !== undefined && index < existingFolders.length) {
            // Update by index (for folder management overlay)
            existingFolders[index].color = colorValue;
            
            // If we have access to the local folders array, update it too
            if (typeof folders !== 'undefined' && folders && folders[index]) {
                folders[index].color = colorValue;
            }
        } else {
            console.error('[saveFolderColor] Invalid index or folder not found');
            return false;
        }
        
        // Save back to Chrome storage
        await chrome.storage.sync.set(response);
        console.log('[saveFolderColor] Saved updated folder color to Chrome storage');
        return true;
    } catch (error) {
        console.error('[saveFolderColor] Error saving folder color:', error);
        return false;
    }
}

// Function to apply color to a folder element
function applyFolderColor(folderDiv, colorValue) {
    if (colorValue) {
        // Set data attribute to indicate this folder has a color
        folderDiv.setAttribute('data-has-color', 'true');
        
        // Apply a subtle background color
        folderDiv.style.backgroundColor = colorValue.replace('0.6', '0.15');
        folderDiv.style.borderColor = colorValue.replace('0.6', '0.3');
        
        // Set the color for the ::before pseudo-element
        folderDiv.style.setProperty('--folder-accent-color', colorValue);
        
        // Style the folder icon
        const folderIconSvg = folderDiv.querySelector('.folder-icon svg');
        if (folderIconSvg) {
            folderIconSvg.style.stroke = colorValue.replace('0.6', '0.8');
        }
        
        // Style the folder icon count badge if it exists
        const folderIconCount = folderDiv.querySelector('.folder-icon-count');
        if (folderIconCount) {
            folderIconCount.style.backgroundColor = colorValue.replace('0.6', '0.8');
        }
        
        // Add a color indicator dot
        let folderHeader = folderDiv.querySelector('.folder-header');
        let colorIndicator = folderHeader.querySelector('.folder-color-indicator');
        
        if (!colorIndicator) {
            colorIndicator = document.createElement('span');
            colorIndicator.className = 'folder-color-indicator';
            folderHeader.insertBefore(colorIndicator, folderHeader.firstChild);
        }
        
        colorIndicator.style.backgroundColor = colorValue.replace('0.6', '0.9');
        
        // Adjust the folder icon color to complement the background
        const folderIcon = folderDiv.querySelector('.folder-icon');
        if (folderIcon) {
            // Extract the base color from the rgba value
            const colorMatch = colorValue.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
            if (colorMatch) {
                const r = parseInt(colorMatch[1]);
                const g = parseInt(colorMatch[2]);
                const b = parseInt(colorMatch[3]);
                folderIcon.style.color = `rgb(${r}, ${g}, ${b})`;
            } else {
                folderIcon.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        }
    } else {
        // Reset to default styling
        folderDiv.removeAttribute('data-has-color');
        folderDiv.style.backgroundColor = '';
        folderDiv.style.borderColor = '';
        folderDiv.style.setProperty('--folder-accent-color', '');
        
        // Remove color indicator if it exists
        const colorIndicator = folderDiv.querySelector('.folder-color-indicator');
        if (colorIndicator) {
            colorIndicator.remove();
        }
        
        const folderIcon = folderDiv.querySelector('.folder-icon');
        if (folderIcon) {
            folderIcon.style.color = '';
        }
    }
}

// Function to apply color to a checkbox item
function applyCheckboxItemColor(checkboxItem, colorValue) {
    if (colorValue) {
        // Set data attribute to indicate this item has a color
        checkboxItem.setAttribute('data-has-color', 'true');
        
        // Apply a subtle background color
        checkboxItem.style.backgroundColor = colorValue.replace('0.6', '0.2');
        checkboxItem.style.borderColor = colorValue.replace('0.6', '0.4');
        
        // Add a color indicator
        let colorIndicator = checkboxItem.querySelector('.checkbox-color-indicator');
        if (!colorIndicator) {
            colorIndicator = document.createElement('span');
            colorIndicator.className = 'checkbox-color-indicator';
            checkboxItem.appendChild(colorIndicator);
        }
        
        colorIndicator.style.backgroundColor = colorValue.replace('0.6', '0.9');
        
        // Update the folder icon color
        const folderIcon = checkboxItem.querySelector('.folder-icon-wrapper');
        if (folderIcon) {
            // Extract the base color from the rgba value
            const colorMatch = colorValue.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
            if (colorMatch) {
                const r = parseInt(colorMatch[1]);
                const g = parseInt(colorMatch[2]);
                const b = parseInt(colorMatch[3]);
                folderIcon.style.color = `rgb(${r}, ${g}, ${b})`;
            } else {
                folderIcon.style.color = 'rgba(255, 255, 255, 0.9)';
            }
        }
        
        // Update the color button tooltip
        const colorButton = checkboxItem.querySelector('.checkbox-color-btn');
        if (colorButton) {
            colorButton.title = "Change folder color";
        }
    } else {
        // Reset to default styling
        checkboxItem.removeAttribute('data-has-color');
        checkboxItem.style.backgroundColor = '';
        checkboxItem.style.borderColor = '';
        
        // Remove color indicator if it exists
        const colorIndicator = checkboxItem.querySelector('.checkbox-color-indicator');
        if (colorIndicator) {
            colorIndicator.remove();
        }
        
        // Reset the folder icon color
        const folderIcon = checkboxItem.querySelector('.folder-icon-wrapper');
        if (folderIcon) {
            folderIcon.style.color = '';
        }
        
        // Update the color button tooltip
        const colorButton = checkboxItem.querySelector('.checkbox-color-btn');
        if (colorButton) {
            colorButton.title = "Add folder color";
        }
    }
}


// Function to generate and download the PDF

function pdfmaker() {
    // Only create the button if we're on chatgpt.com
    if (!window.location.href.includes("chatgpt.com")) {
        return; // Exit early if not on chatgpt.com
    }

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
        extractAndExportMessageContent();
    });

    // Append the button to the body (only if it doesn't already exist)
    if (!document.getElementById("pdf-download-btn")) {
        document.body.appendChild(button);
    }
}
  
function extractAndExportMessageContent() {
    const elements = document.querySelectorAll('[data-message-author-role]');
    const messages = [];
    const softwarename = "ChatGPT Organizer";
    const href = window.location.href;

    elements.forEach((element, index) => {
        const role = element.getAttribute('data-message-author-role');
        const messageId = element.getAttribute('data-message-id') || `unknown-${index}`;
        const modelSlug = role === 'assistant' ? (element.getAttribute('data-message-model-slug') || 'unknown-model') : null;
        const contentHTML = element.innerHTML;

        messages.push({
        id: messageId,
        role: role,
        modelSlug: modelSlug,
        contentHTML: contentHTML,
        index: index
        });
    });

    const newWindow = window.open('', '_blank', 'width=800,height=600');
    
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Conversation generated by ${softwarename}</title>
            <style>
            body {
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                margin: 0;
                background: #f5f6f5;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 700px;
                margin: 40px auto;
                padding: 0 20px;
            }
            .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #e0e0e0;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                color: #2c3e50;
            }
            .header p {
                margin: 5px 0;
                font-size: 14px;
                color: #555;
            }
            .message {
                margin-bottom: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                transition: transform 0.2s ease;
            }
            .message:hover {
                transform: translateY(-2px);
            }
            .role-user .content {
                background: #ffffff;
            }
            .role-assistant .content {
                background: #f8f9ff;
            }
            .role {
                font-weight: 600;
                font-size: 14px;
                color: #666;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .content {
                padding: 10px;
                border-radius: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
            }
            .model-slug {
                color: #888;
                font-size: 12px;
                margin-left: 8px;
                font-weight: normal;
            }
            /* Dark theme for code blocks */
            pre, code {
                background: #1e1e1e;
                color: #d4d4d4;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 13px;
                overflow-x: auto;
                max-width: 100%;
                display: block;
            }
            pre {
                padding: 12px;
                margin: 8px 0;
            }
            code {
                padding: 2px 6px;
                display: inline-block;
            }
            /* Beautiful table styling */
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                background: #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-radius: 6px;
                overflow: hidden;
            }
            th, td {
                padding: 12px 15px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }
            th {
                background: #2c3e50;
                color: #ffffff;
                font-weight: 600;
            }
            tr:nth-child(even) {
                background: #f9fafb;
            }
            tr:hover {
                background: #f1f5f9;
            }
            td {
                vertical-align: top;
            }
            </style>
        </head>
        <body>
            <div class="container">
            <div class="header">
                <h1>PDF exported by ${softwarename} on ${new Date().toLocaleString()}.</h1>
                <p>URL: ${href}</p>
            </div>
            ${messages.map(msg => `
                <div class="message role-${msg.role}">
                <div class="role">
                    ${msg.role}
                    ${msg.modelSlug ? `<span class="model-slug">(${msg.modelSlug})</span>` : ''}
                </div>
                <div class="content">${msg.contentHTML}</div>
                </div>
            `).join('')}
            </div>
        </body>
        </html>
    `);
    showNotification("PDF exported successfully press ctrl+p to send to your printer!");
    newWindow.document.close();

}

function showNotification(message, duration = 5000) {
    const notification = document.createElement('div');
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: rgba(46, 204, 113, 0.9); /* Soft green for success */
        color: #ffffff;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1000;
        transform: translateY(100px); /* Start below the viewport */
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Slide in and fade in
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 100);

    // Slide out and fade out after duration
    setTimeout(() => {
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
        setTimeout(() => {
        notification.remove();
        }, 300); // Match transition duration
    }, duration);
}


// Start observing the document for changes
domwatcherforaskbox.observe(document.documentElement, { childList: true, subtree: true });
// Start observing the document for changes
dommenubuttoncreator.observe(document.documentElement, { childList: true, subtree: true });

// Add this function to show the product selection overlay
function showProductSelectionOverlay() {
    // Check if overlay already exists
    const existingOverlay = document.getElementById('product-selection-overlay');
    if (existingOverlay) {
        // Make sure it's visible and reset its state
        existingOverlay.style.display = 'flex';
        
        // Reset the content transform
        const content = existingOverlay.querySelector('.product-selection-content');
        if (content) {
            content.style.transform = 'translateY(0)';
        }
        
        // Fade it in
        setTimeout(() => {
            existingOverlay.style.opacity = '1';
        }, 10);
        
        return;
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'product-selection-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // Create content container
    const content = document.createElement('div');
    content.className = 'product-selection-content';
    content.style.cssText = `
        background-color: #111827;
        border-radius: 1rem;
        width: 72%;
        max-width: 960px;
        max-height: 90vh;
        padding: 2rem;
        transform: translateY(20px);
        transition: transform 0.3s ease;
        position: relative;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: visible; /* Change from auto to visible to prevent scrolling */
    `;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'product-overlay-close';
    closeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeButton.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        z-index: 10;
        transition: background-color 0.2s ease;
    `;
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    closeButton.addEventListener('click', () => {
        overlay.style.opacity = '0';
        content.style.transform = 'translateY(20px)';
        setTimeout(() => {
            // Instead of just hiding it, remove it from the DOM completely
            overlay.remove();
        }, 300);
    });
    content.appendChild(closeButton);

    // Create product selection content directly
    const productSelectionHTML = `
        <div class="container" style="max-width: 960px; width: 100%;">
            <div class="header" style="text-align: center; margin-bottom: 1.6rem;">
                <h1 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.6rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Choose Your Plan</h1>
                <p style="font-size: 0.85rem; color: #d1d5db; max-width: 480px; margin: 0 auto; line-height: 1.4;">Select the perfect plan to organize your AI conversations.</p>
            </div>

            <div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; margin-top: 1rem;">
                <div class="pricing-card" style="background-color: #1f2937; border-radius: 0.8rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; position: relative; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div class="card-header" style="padding: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(31, 41, 55, 0.8); backdrop-filter: blur(10px);">
                        <div class="plan-name" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.3rem; color: #f9fafb;">Monthly</div>
                        <div class="price" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.4rem; color: #6366f1;">€1.99 <span style="font-size: 0.7rem; color: #d1d5db; font-weight: 400;">/month</span></div>
                        <p style="color: #d1d5db; font-size: 0.8rem;">Billed monthly</p>
                    </div>
                    <div class="card-body" style="padding: 1.2rem 1.2rem 0.8rem;">
                        <ul class="features" style="list-style: none; margin-bottom: 1.2rem; font-size: 0.85rem;">
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Unlimited folders</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> 5 PDF exports per day</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> No ads</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Basic folder colors</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;">
                                <span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> 
                                <span style="display: flex; align-items: center; flex-wrap: nowrap;">Coming for Grok <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🤖</span> and Claude <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🧠</span></span>
                            </li>
                        </ul>
                        <button class="btn btn-outline" style="display: block; width: 100%; padding: 0.7rem; border-radius: 0.4rem; background-color: transparent; color: #6366f1; text-align: center; font-weight: 600; cursor: pointer; transition: background-color 0.2s ease; border: 2px solid #6366f1; outline: none; text-decoration: none; font-size: 0.9rem;">Get Started</button>
                    </div>
                </div>

                <div class="pricing-card popular" style="background-color: #1f2937; border-radius: 0.8rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; position: relative; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="position: absolute; top: 0.6rem; right: 0.6rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-size: 0.6rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 1rem; letter-spacing: 0.05em; z-index: 1;">SAVE 20%</div>
                    <div class="card-header" style="padding: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(31, 41, 55, 0.8); backdrop-filter: blur(10px);">
                        <div class="plan-name" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.3rem; color: #f9fafb;">Annual</div>
                        <div class="price" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.4rem; color: #6366f1;">€18 <span style="font-size: 0.7rem; color: #d1d5db; font-weight: 400;">/year</span></div>
                        <p style="color: #d1d5db; font-size: 0.8rem;">Billed annually</p>
                    </div>
                    <div class="card-body" style="padding: 1.2rem 1.2rem 0.8rem;">
                        <ul class="features" style="list-style: none; margin-bottom: 1.2rem; font-size: 0.85rem;">
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Unlimited folders</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Unlimited PDF exports</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> No ads</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> 20% savings</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;">
                                <span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> 
                                <span style="display: flex; align-items: center; flex-wrap: nowrap;">Coming for Grok <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🤖</span> and Claude <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🧠</span></span>
                            </li>
                        </ul>
                        <button class="btn" style="display: block; width: 100%; padding: 0.7rem; border-radius: 0.4rem; background-color: #6366f1; color: white; text-align: center; font-weight: 600; cursor: pointer; transition: background-color 0.2s ease; border: none; outline: none; text-decoration: none; font-size: 0.9rem;">Choose Annual</button>
                    </div>
                </div>

                <div class="pricing-card" style="background-color: #1f2937; border-radius: 0.8rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; position: relative; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="position: absolute; top: 0.6rem; right: 0.6rem; background: linear-gradient(135deg, #10b981, #059669); color: white; font-size: 0.6rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 1rem; letter-spacing: 0.05em; z-index: 1;">BEST VALUE</div>
                    <div class="card-header" style="padding: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(31, 41, 55, 0.8); backdrop-filter: blur(10px);">
                        <div class="plan-name" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.3rem; color: #f9fafb;">Lifetime</div>
                        <div class="price" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.4rem; color: #10b981;">€50 <span style="font-size: 0.7rem; color: #d1d5db; font-weight: 400;">one-time</span></div>
                        <p style="color: #d1d5db; font-size: 0.8rem;">Pay once, use forever</p>
                    </div>
                    <div class="card-body" style="padding: 1.2rem 1.2rem 0.8rem;">
                        <ul class="features" style="list-style: none; margin-bottom: 1.2rem; font-size: 0.85rem;">
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Unlimited folders</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Unlimited PDF exports</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> No ads</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;"><span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> Lifetime access</li>
                            <li style="margin-bottom: 0.6rem; display: flex; align-items: center; color: #d1d5db;">
                                <span style="color: #10b981; font-weight: bold; margin-right: 0.5rem;">✓</span> 
                                <span style="display: flex; align-items: center; flex-wrap: nowrap;">Coming for Grok <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🤖</span> and Claude <span style="display: inline-block; margin: 0 0.2rem; font-size: 1rem;">🧠</span></span>
                            </li>
                        </ul>
                        <button class="btn btn-outline" style="display: block; width: 100%; padding: 0.7rem; border-radius: 0.4rem; background-color: transparent; color: #10b981; text-align: center; font-weight: 600; cursor: pointer; transition: background-color 0.2s ease; border: 2px solid #10b981; outline: none; text-decoration: none; font-size: 0.9rem;">Get Lifetime</button>
                    </div>
                </div>
            </div>

            <div class="guarantee" style="text-align: center; margin-top: 1.2rem; color: #d1d5db; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color: #d1d5db;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>30-day money-back guarantee</span>
            </div>

            <div class="team-info" style="text-align: center; margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); color: #9ca3af; font-size: 0.8rem; line-height: 1.4;">
                <p>🇮🇹 Proudly made with love ❤️ in Rome, Italy</p>
            </div>
        </div>
    `;

    // Create a container for the content
    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = productSelectionHTML;
    content.appendChild(contentContainer);

    // Add hover effects for pricing cards
    const addHoverEffects = () => {
        const cards = content.querySelectorAll('.pricing-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 15px rgba(0, 0, 0, 0.1)';
            });
        });

        // Add hover effects for buttons
        const buttons = content.querySelectorAll('.btn');
        buttons.forEach(button => {
            if (button.classList.contains('btn-outline')) {
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = 'transparent';
                });
            } else {
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = '#4f46e5';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = '#6366f1';
                });
            }
        });
    };

    // Add event listeners to buttons
    const addButtonListeners = () => {
        const buttons = document.querySelectorAll('.product-selection-content .btn');
        
        // Monthly plan button (first button)
        if (buttons[0]) {
            buttons[0].addEventListener('click', () => {
                const planName = 'Monthly';
                showNotification(`You selected the ${planName} plan. Redirecting to checkout...`);
                
                // Close the overlay with animation
                const overlay = document.getElementById('product-selection-overlay');
                const content = overlay.querySelector('.product-selection-content');
                
                overlay.style.opacity = '0';
                content.style.transform = 'translateY(20px)';
                
                // Redirect after animation completes
                setTimeout(() => {
                    // Make a fetch POST request to get the Stripe checkout URL
                    fetch(`${CONFIG.API_BASE_URL}/create-checkout-session-monthly`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: state.userEmail })
                    })
                    .then(response => response.text())
                    .then(url => {
                        // Open the Stripe checkout URL in a new window
                        if (url && url.includes('https://')) {
                            window.open(url, '_blank');
                        } else {
                            console.error('Invalid checkout URL received:', url);
                            showNotification('Error creating checkout session. Please try again.');
                        }
                    })
                    .catch(error => {
                        console.error('Error creating checkout session:', error);
                        showNotification('Error creating checkout session. Please try again.');
                    });
                }, 300);
            });
        }
        
        // Annual plan button (second button)
        if (buttons[1]) {
            buttons[1].addEventListener('click', () => {
                const planName = 'Annual';
                showNotification(`You selected the ${planName} plan. Redirecting to checkout...`);
                
                // Close the overlay with animation
                const overlay = document.getElementById('product-selection-overlay');
                const content = overlay.querySelector('.product-selection-content');
                
                overlay.style.opacity = '0';
                content.style.transform = 'translateY(20px)';
                
                // Redirect after animation completes
                setTimeout(() => {
                    // Make a fetch POST request to get the Stripe checkout URL
                    fetch(`${CONFIG.API_BASE_URL}/create-checkout-session-yearly`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: state.userEmail })
                    })
                    .then(response => response.text())
                    .then(url => {
                        // Open the Stripe checkout URL in a new window
                        if (url && url.includes('https://')) {
                            window.open(url, '_blank');
                        } else {
                            console.error('Invalid checkout URL received:', url);
                            showNotification('Error creating checkout session. Please try again.');
                        }
                    })
                    .catch(error => {
                        console.error('Error creating checkout session:', error);
                        showNotification('Error creating checkout session. Please try again.');
                    });
                }, 300);
            });
        }
        
        // Lifetime plan button (third button)
        if (buttons[2]) {
            buttons[2].addEventListener('click', () => {
                const planName = 'Lifetime';
                showNotification(`You selected the ${planName} plan. Redirecting to checkout...`);
                
                // Close the overlay with animation
                const overlay = document.getElementById('product-selection-overlay');
                const content = overlay.querySelector('.product-selection-content');
                
                overlay.style.opacity = '0';
                content.style.transform = 'translateY(20px)';
                
                // Redirect after animation completes
                setTimeout(() => {
                    // Make a fetch POST request to get the Stripe checkout URL
                    fetch(`${CONFIG.API_BASE_URL}/create-checkout-session-lifetime`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: state.userEmail })
                    })
                    .then(response => response.text())
                    .then(url => {
                        // Open the Stripe checkout URL in a new window
                        if (url && url.includes('https://')) {
                            window.open(url, '_blank');
                        } else {
                            console.error('Invalid checkout URL received:', url);
                            showNotification('Error creating checkout session. Please try again.');
                        }
                    })
                    .catch(error => {
                        console.error('Error creating checkout session:', error);
                        showNotification('Error creating checkout session. Please try again.');
                    });
                }, 300);
            });
        }
    };
    
    // Add overlay and content to the document
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Add hover effects and button listeners
    addHoverEffects();
    addButtonListeners();

    // Trigger animation after a small delay
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 10);

    // Add click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
            setTimeout(() => {
                // Instead of just hiding it, remove it from the DOM completely
                overlay.remove();
            }, 300);
        }
    });

    // Add styles for the overlay
    const style = document.createElement('style');
    style.textContent = `
        #product-selection-overlay {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #product-selection-overlay .product-selection-content::-webkit-scrollbar {
            width: 8px;
        }
        
        #product-selection-overlay .product-selection-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        
        #product-selection-overlay .product-selection-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
        }
        
        #product-selection-overlay .product-selection-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    `;
    document.head.appendChild(style);
}
