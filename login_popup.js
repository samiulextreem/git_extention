// popup.js

// Constants for configuration
const CONFIG = {
	API_BASE_URL: 'https://790a-2-40-40-33.ngrok-free.app',
	MAX_RETRIES: 3,
	RETRY_DELAY: 1000,
	POLL_INTERVAL: 3000,
	MAX_POLL_TIME: 300000, // 5 minutes
	REQUEST_TIMEOUT: 10000  // 10 seconds
};

document.addEventListener('DOMContentLoaded', () => {
	const messageDiv = document.getElementById('message');
	const emailInput = document.getElementById('email');
	const requestButton = document.getElementById('requestButton');
	
	let pollTimer = null;
	let pollInterval = null;
	
	// Focus the email input when the popup opens
	emailInput.focus();
	
	function showMessage(text, type = 'error') {
		if (!messageDiv) return;
		messageDiv.textContent = text;
		messageDiv.className = 'message show ' + type;
	}
	
	function hideMessage() {
		if (!messageDiv) return;
		messageDiv.className = 'message';
	}
	
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
	
	function validateEmail(email) {
		if (!email) return false;
		const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return re.test(String(email).toLowerCase());
	}

	// Enhanced fetch with timeout and retry
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

	function clearPolling() {
		if (pollInterval) clearInterval(pollInterval);
		if (pollTimer) clearTimeout(pollTimer);
		pollInterval = null;
		pollTimer = null;
	}

	async function requestMagicLink() {
		try {
			hideMessage();
			const inputemail = emailInput?.value?.trim();
			
			if (!inputemail) {
				showMessage('Please enter your email address', 'error');
				emailInput?.focus();
				return;
			}
			
			if (!validateEmail(inputemail)) {
				showMessage('Please enter a valid email address', 'error');
				emailInput?.focus();
				return;
			}
			
			setLoading(true);
			
			const stored_data = await new Promise(resolve => 
				chrome.storage.sync.get(null, resolve)
			);
			
			if (stored_data?.useremail === inputemail) {
				console.log("User exists - checking auth status");
				await checkAuthStatus(inputemail);
			} else {
				console.log("Email changed - requesting new magic link");
				await requestMagicLinkForEmail(inputemail);
			}
		} catch (error) {
			console.error('Error in requestMagicLink:', error);
			showMessage('An error occurred. Please try again.', 'error');
			setLoading(false);
		}
	}

	async function checkAuthStatus(email) {
		if (!email) {
			console.error('No email provided to checkAuthStatus');
			return;
		}

		try {
			const response = await fetchWithRetry(
				`${CONFIG.API_BASE_URL}/api/get_auth_status?email=${encodeURIComponent(email)}`,
				{ method: 'GET' }
			);

			const data = await response.json();
			console.log('[login_popup.js] auth status data:', data);
			
			if (data.authenticated === true) {
				showMessage('Login successful! Redirecting...', 'success');
				console.log('log in successful', data.authenticated);
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

	function closePopup(delay) {
		setTimeout(() => {
			try {
				window.close();
			} catch (error) {
				console.error('Error closing popup:', error);
			}
		}, delay);
	}

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

	async function mergeSyncAndUpdateChromeStorage(useremail, existingData) {
		if (!useremail) {
			throw new Error('Email is required for storage sync');
		}

		try {
			const userData = await pullDataFromFirebaseServer(useremail);
			const updatedData = {
				...existingData,
				...userData,
				useremail, // Ensure email is stored
				last_sync: new Date().toISOString() // Add sync timestamp
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

	async function requestMagicLinkForEmail(mail) {
		try {
			const response = await fetchWithRetry(
				`${CONFIG.API_BASE_URL}/api/request_magic_link`,
				{
					method: 'POST',
					body: JSON.stringify({ inputemail: mail })
				}
			);

			const data = await response.json();
			showMessage(data.message + ' Check your email inbox!', 'success');
			console.log("Magic link sent");
			
			// Clear any existing polling
			clearPolling();
			
			// Start new polling
			pollInterval = setInterval(() => {
				checkAuthStatus(mail).catch(console.error);
			}, CONFIG.POLL_INTERVAL);
			
			// Set timeout to clear polling
			pollTimer = setTimeout(() => {
				clearPolling();
				if (requestButton?.classList.contains('loading')) {
					setLoading(false);
					showMessage('Session expired. Please request a new magic link.', 'error');
				}
			}, CONFIG.MAX_POLL_TIME);
			
		} catch (error) {
			console.error('Error requesting magic link:', error);
			showMessage('Error sending magic link. Please try again.', 'error');
			setLoading(false);
		}
	}

	// Clean up function
	function cleanup() {
		clearPolling();
		setLoading(false);
	}

	// Add event listeners
	requestButton?.addEventListener('click', requestMagicLink);
	emailInput?.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			requestMagicLink();
		}
	});

	// Clean up on window unload
	window.addEventListener('unload', cleanup);
});



