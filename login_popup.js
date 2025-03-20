/**
 * login_popup.js - Handles authentication flow for the extension
 */

// Constants for configuration
const CONFIG = {
	// API_BASE_URL will be set dynamically from the config
	API_BASE_URL: null,
	MAX_RETRIES: 3,
	RETRY_DELAY: 1000,
	POLL_INTERVAL: 3000,
	MAX_POLL_TIME: 300000, // 5 minutes
	REQUEST_TIMEOUT: 10000,  // 10 seconds
	STORAGE_KEYS: {
		USER_EMAIL: 'useremail',
		LAST_SYNC: 'last_sync'
	}
};

// State management
const state = {
	pollTimer: null,
	pollInterval: null
};

/**
 * Initialize the popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
	const messageDiv = document.getElementById('message');
	const emailInput = document.getElementById('email');
	const requestButton = document.getElementById('requestButton');
	
	// Load API URL from configuration
	await loadApiUrl();
	
	// Focus the email input when the popup opens
	emailInput?.focus();
	
	// Add event listeners
	requestButton?.addEventListener('click', requestMagicLink);
	
	// Add cleanup on window close
	window.addEventListener('beforeunload', cleanup);
	
	/**
	 * Load API URL from configuration
	 */
	async function loadApiUrl() {
		try {
			// Request API URL from background script
			const response = await new Promise((resolve) => {
				chrome.runtime.sendMessage({ action: 'getApiUrl' }, (response) => {
					resolve(response);
				});
			});
			
			if (response && response.apiUrl) {
				// Remove trailing slash if present
				CONFIG.API_BASE_URL = response.apiUrl.replace(/\/$/, '');
				console.log('API URL loaded:', CONFIG.API_BASE_URL);
			} else {
				console.warn('Failed to load API URL from config, using fallback');
			}
		} catch (error) {
			console.error('Error loading API URL:', error);

		}
	}
	
	/**
	 * Display a message to the user
	 * @param {string} text - Message text
	 * @param {string} type - Message type (error or success)
	 */
	function showMessage(text, type = 'error') {
		if (!messageDiv) return;
		messageDiv.textContent = text;
		messageDiv.className = 'message show ' + type;
	}
	
	/**
	 * Hide the message
	 */
	function hideMessage() {
		if (!messageDiv) return;
		messageDiv.className = 'message';
	}
	
	/**
	 * Set loading state
	 * @param {boolean} isLoading - Whether the UI is in loading state
	 */
	function setLoading(isLoading) {
		if (!requestButton) return;
		if (isLoading) {
			requestButton.classList.add('loading');
			requestButton.disabled = true;
		} else {
			requestButton.classList.remove('loading');
			requestButton.disabled = false;
		}
	}
	
	/**
	 * Validate email format
	 * @param {string} email - Email to validate
	 * @returns {boolean} - Whether the email is valid
	 */
	function validateEmail(email) {
		if (!email) return false;
		const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return re.test(String(email).toLowerCase());
	}

	/**
	 * Enhanced fetch with timeout and retry
	 * @param {string} url - URL to fetch
	 * @param {Object} options - Fetch options
	 * @param {number} retries - Number of retries
	 * @returns {Promise<Response>} - Fetch response
	 */
	async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
		const timeout = new Promise((_, reject) => 
			setTimeout(() => reject(new Error('Request timeout')), CONFIG.REQUEST_TIMEOUT)
		);

		for (let i = 0; i < retries; i++) {
			try {
				const fetchPromise = fetch(url, {
					...options,
					headers: {
						'Content-Type': 'application/json',
						...options.headers
					}
				});
				const response = await Promise.race([fetchPromise, timeout]);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response;
			} catch (error) {
				if (i === retries - 1) throw error;
				console.log(`Attempt ${i + 1} failed, retrying...`);
				await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
			}
		}
	}

	/**
	 * Clear polling timers
	 */
	function clearPolling() {
		if (state.pollInterval) clearInterval(state.pollInterval);
		if (state.pollTimer) clearTimeout(state.pollTimer);
		state.pollInterval = null;
		state.pollTimer = null;
	}

	/**
	 * Request magic link for authentication
	 */
	async function requestMagicLink() {
		try {
			hideMessage();
			const inputEmail = emailInput?.value?.trim();
			
			if (!inputEmail) {
				showMessage('Please enter your email address', 'error');
				emailInput?.focus();
				return;
			}
			
			if (!validateEmail(inputEmail)) {
				showMessage('Please enter a valid email address', 'error');
				emailInput?.focus();
				return;
			}
			
			setLoading(true);
			
			const storedData = await new Promise(resolve => 
				chrome.storage.sync.get(null, resolve)
			);
			console.log("storedData:", storedData);
			debugger;
			if (storedData?.[CONFIG.STORAGE_KEYS.USER_EMAIL] === inputEmail) {
				console.log("User exists - checking auth status");
				await checkAuthStatus(inputEmail, storedData?.jwt);
			} else {
				console.log("Email changed - requesting new magic link");
				await requestMagicLinkForEmail(inputEmail);
			}
		} catch (error) {
			console.error('Error in requestMagicLink:', error);
			showMessage('An error occurred. Please try again.', 'error');
			setLoading(false);
		}
	}

	/**
	 * Check authentication status
	 * @param {string} email - User email
	 * @param {string} jwt - JSON Web Token for authentication
	 */
	async function checkAuthStatus(email, jwt) {
		if (!email) {
			console.error('No email provided to checkAuthStatus');
			return;
		}

		try {
			const url = `${CONFIG.API_BASE_URL}/api/get_auth_status?email=${encodeURIComponent(email)}`;
			const options = { 
				method: 'GET',
				headers: {}
			};
			
			// Add JWT if available
			if (jwt) {
				options.headers['Authorization'] = `Bearer ${jwt}`;
				console.log('[login_popup.js] jwt:', jwt);
			}
			
			const response = await fetchWithRetry(url, options);

			const data = await response.json();
			console.log('[login_popup.js] auth status data:', data);
			
			if (data.authenticated === true) {
				showMessage('Login successful! Redirecting...', 'success');
				console.log('Log in successful', data.authenticated);
				await mergeSyncAndUpdateChromeStorage(email, {});
				chrome.runtime.sendMessage({ 
					action: "updateTasksToDoAfterLogin", 
					data: email 
				});
				closePopup(2000);
			} else {
				setLoading(false);
			}
		} catch (error) {
			console.error('Error checking auth status:', error);
			showMessage('Error checking authentication status. Please try again.', 'error');
			setLoading(false);
			clearPolling();
		}
	}

	/**
	 * Close the popup after a delay
	 * @param {number} delay - Delay in milliseconds
	 */
	function closePopup(delay) {
		setTimeout(() => {
			try {
				window.close();
			} catch (error) {
				console.error('Error closing popup:', error);
			}
		}, delay);
	}

	/**
	 * Pull data from Firebase server
	 * @param {string} email - User email
	 * @returns {Promise<Object>} - User data
	 */
	async function pullDataFromFirebaseServer(email) {
		if (!email) throw new Error('Email is required for data sync');

		try {
			const response = await fetchWithRetry(
				`${CONFIG.API_BASE_URL}/api/pull_data_from_firebase?email=${encodeURIComponent(email)}`,
				{ method: 'GET' }
			);

			return await response.json();
		} catch (error) {
			console.error('Error syncing data:', error);
			throw new Error('Failed to sync data with server');
		}
	}

	/**
	 * Merge and update Chrome storage with server data
	 * @param {string} userEmail - User email
	 * @param {Object} existingData - Existing data
	 */
	async function mergeSyncAndUpdateChromeStorage(userEmail, existingData) {
		if (!userEmail) {
			throw new Error('Email is required for storage sync');
		}

		try {
			const userData = await pullDataFromFirebaseServer(userEmail);
			const updatedData = {
				...existingData,
				...userData,
				[CONFIG.STORAGE_KEYS.USER_EMAIL]: userEmail, // Ensure email is stored
				[CONFIG.STORAGE_KEYS.LAST_SYNC]: new Date().toISOString() // Add sync timestamp
			};
			
			await new Promise((resolve, reject) => {
				chrome.storage.sync.set(updatedData, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
			
			console.log("Data saved successfully:", updatedData);
		} catch (error) {
			console.error('Failed to sync:', error);
			showMessage('Failed to sync data. Please try again.', 'error');
			setLoading(false);
			throw error;
		}
	}

	/**
	 * Request magic link for email
	 * @param {string} email - User email
	 */
	async function requestMagicLinkForEmail(email) {
		try {
			const response = await fetchWithRetry(
				`${CONFIG.API_BASE_URL}/api/request_magic_link`,
				{
					method: 'POST',
					body: JSON.stringify({ inputemail: email })
				}
			);

			const data = await response.json();
			showMessage(data.message + ' Check your email inbox!', 'success');
			console.log(data);
			// Clear any existing polling
			clearPolling();
			
			// Start new polling
			state.pollInterval = setInterval(() => {
				checkAuthStatus(email).catch(console.error);
			}, CONFIG.POLL_INTERVAL);
			
			// Set timeout to clear polling
			state.pollTimer = setTimeout(() => {
				clearPolling();
				if (requestButton?.classList.contains('loading')) {
					setLoading(false);
					showMessage('Session expired. Please request a new magic link.', 'error');
				}
			}, CONFIG.MAX_POLL_TIME);
			
		} catch (error) {
			console.error('Error requesting magic link:', error);
			showMessage('Failed to send magic link. Please try again.', 'error');
			setLoading(false);
		}
	}

	/**
	 * Clean up resources
	 */
	function cleanup() {
		clearPolling();
	}
});



