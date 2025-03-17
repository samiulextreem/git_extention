// background.js - Background service worker for the extension
import { initializeConfig, getConfigFromStorage } from './utils/config_loader.js';

// Configuration
const CONFIG = {
    STORAGE_KEYS: {
        USER_EMAIL: 'useremail',
        HAS_SEEN_WELCOME: 'hasSeenWelcome',
        IS_PREMIUM: 'isPremium',
        APP_CONFIG: 'appConfig'
    },
    POPUP: {
        WIDTH: 400,
        HEIGHT: 600
    }
};

// State management
let popupWindowId = null; // Variable to store the popup window ID

/**
 * Initialize the background service worker
 */
async function initialize() {
    // Load configuration from YAML file
    try {
        await initializeConfig();
        console.log('Configuration initialized');
    } catch (error) {
        console.error('Error initializing configuration:', error);
    }
    
    setupMessageListeners();
    setupInstallListener();
}

/**
 * Set up message listeners for communication with content scripts
 */
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Background received message:', request.action);
        
        switch (request.action) {
            case 'openpopup':
                createPopupWindow();
                break;
                
            case 'updateTasksToDoAfterLogin':
                const email = request.data;
                updateUserFunctionality(email);
                console.log('Welcome back,', email);
                break;
                
            case 'download':
                handleDownload(request);
                break;
                
            case 'getApiUrl':
                getConfigFromStorage().then(config => {
                    sendResponse({ apiUrl: config.apiUrl || null });
                });
                return true; // Indicate async response
                
            default:
                console.log('Unknown action:', request.action);
        }
        
        // Return true to indicate async response (if needed)
        return true;
    });
}

/**
 * Set up install listener to show welcome page on first install
 */
function setupInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === "install") {
            showWelcomePage();
        }
    });
}

/**
 * Show welcome page on first install
 */
function showWelcomePage() {
    chrome.storage.local.get([CONFIG.STORAGE_KEYS.HAS_SEEN_WELCOME], (result) => {
        if (!result[CONFIG.STORAGE_KEYS.HAS_SEEN_WELCOME]) {
            chrome.tabs.create({ url: "welcome.html" });
            chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.HAS_SEEN_WELCOME]: true });
        }
    });
}

/**
 * Create popup window for login
 */
function createPopupWindow() {
    chrome.windows.create({
        url: chrome.runtime.getURL("login_popup.html"),
        type: "panel",
        width: CONFIG.POPUP.WIDTH,
        height: CONFIG.POPUP.HEIGHT
    }, (window) => {
        popupWindowId = window.id;
    });
}

/**
 * Handle download request from content script
 * @param {Object} request - The download request
 */
function handleDownload(request) {
    chrome.downloads.download({
        url: request.url,
        filename: request.filename,
        saveAs: true // Prompts the user to choose location
    });
}

/**
 * Update user functionality after login
 * @param {string} email - User email
 */
function updateUserFunctionality(email) {
    chrome.tabs.query({}, (tabs) => {
        if (tabs && tabs.length > 0) {
            console.log("Checking tabs for matches...");
            tabs.forEach((tab) => {
                const tabUrl = tab.url || "No URL (e.g., chrome:// page)";

                if (tabUrl.includes("chatgpt.com")) {
                    // Only update the login button with user name
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "updateloginevent", 
                        data: email 
                    });
                }
            });
        } else {
            console.log("No tabs found.");
        }
    });
}

/**
 * Check payment status for the current user
 */
function checkPaymentStatus() {
    // Only check sync storage for user email
    chrome.storage.sync.get(CONFIG.STORAGE_KEYS.USER_EMAIL, function(result) {
        const userEmail = result[CONFIG.STORAGE_KEYS.USER_EMAIL];
        
        if (userEmail) {
            console.log('Checking payment status for:', userEmail);
            verifyPayment(userEmail);
        } else {
            // Not found in sync storage
            console.log('No email found in sync storage, user not logged in');
            chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.IS_PREMIUM]: false
            }, function() {
                console.log('Premium status set to false (no user)');
            });
        }
    });
}

/**
 * Clear extension storage (for debugging)
 */
function clearExtensionStorage() {
    console.log('Clearing storage from background');
    chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing storage:", chrome.runtime.lastError);
        } else {
            console.log("Sync storage cleared!");
        }
    });
}

// Initialize the background service worker
initialize();


