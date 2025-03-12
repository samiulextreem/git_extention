// popup.js
document.addEventListener('DOMContentLoaded', () => {
	const messageDiv = document.getElementById('message');
	const emailInput = document.getElementById('email');
	const requestButton = document.getElementById('requestButton');
	
	// Focus the email input when the popup opens
	emailInput.focus();
	
	function showMessage(text, type = 'error') {
		messageDiv.textContent = text;
		messageDiv.className = 'message show ' + type;
	}
	
	function hideMessage() {
		messageDiv.className = 'message';
	}
	
	function setLoading(isLoading) {
		if (isLoading) {
			requestButton.classList.add('loading');
			requestButton.disabled = true;
		} else {
			requestButton.classList.remove('loading');
			requestButton.disabled = false;
		}
	}
	
	function validateEmail(email) {
		const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(String(email).toLowerCase());
	}
	
	function requestMagicLink() {
		hideMessage();
		const inputemail = emailInput.value.trim();
		
		if (!inputemail) {
			showMessage('Please enter your email address', 'error');
			emailInput.focus();
			return;
		}
		
		if (!validateEmail(inputemail)) {
			showMessage('Please enter a valid email address', 'error');
			emailInput.focus();
			return;
		}
		
		setLoading(true);
		
		chrome.storage.sync.get(null, (stored_data) => {
			if (stored_data.hasOwnProperty('useremail') && stored_data.useremail === inputemail) {
				console.log("User exists - checking auth status");
				checkAuthStatus(inputemail);
			} else {
				console.log("Email changed - requesting new magic link");
				requestMagicLinkForEmail(inputemail);
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
			
			if (data.authenticated == true) {
				showMessage('Login successful! Redirecting...', 'success');
				console.log('log in successful', data.authenticated);
				mergeSyncAndUpdateChromeStorage(email, {});
				chrome.runtime.sendMessage({ action: "updateTasksToDoAfterLogin", data: email });
				closePopup(2000);
			} else {
				setLoading(false);
			}
		} catch (error) {
			console.error('Error checking auth status:', error);
			showMessage('Error checking authentication status. Please try again.', 'error');
			setLoading(false);
		}
	}

	// Add event listeners
	requestButton.addEventListener('click', requestMagicLink);
	
	// Allow pressing Enter to submit
	emailInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			requestMagicLink();
		}
	});

	function closePopup(delay) {
		setTimeout(() => {
			window.close();
		}, delay);
	}

	// Function to sync data with the server
	async function pullDataFromFirebaseServer(email) {
		try {
			const response = await fetch(`http://localhost:8080/api/pull_data_from_firebase?email=${encodeURIComponent(email)}`, {
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

	function mergeSyncAndUpdateChromeStorage(useremail, existingData) {
		pullDataFromFirebaseServer(useremail)
			.then(userData => {
				const updatedData = {
					...existingData,
					...userData
				};
				
				chrome.storage.sync.set(updatedData, () => {
					if (chrome.runtime.lastError) {
						console.error("Login_popup.js Error saving data:", chrome.runtime.lastError);
						showMessage('Error saving data. Please try again.', 'error');
						setLoading(false);
					} else {
						console.log("Data saved successfully from Login_popup.js:", updatedData);
					}
				});
			})
			.catch(error => {
				console.error('Failed to sync:', error);
				showMessage('Failed to sync data. Please try again.', 'error');
				setLoading(false);
			});
	}

	function requestMagicLinkForEmail(mail) {
		fetch('http://localhost:8080/api/request_magic_link', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ inputemail: mail })
		})
		.then(res => {
			if (!res.ok) {
				throw new Error('Network response was not ok');
			}
			return res.json();
		})
		.then(data => {
			showMessage(data.message + ' Check your email inbox!', 'success');
			console.log("magic link is sent");
			
			// Start polling for auth status
			const pollInterval = setInterval(() => {
				checkAuthStatus(mail);
			}, 3000);
			
			// Clear interval after 5 minutes (300000ms) to prevent indefinite polling
			setTimeout(() => {
				clearInterval(pollInterval);
				if (requestButton.classList.contains('loading')) {
					setLoading(false);
					showMessage('Session expired. Please request a new magic link.', 'error');
				}
			}, 300000);
		})
		.catch(error => {
			console.error('Error requesting magic link:', error);
			showMessage('Error sending magic link. Please try again.', 'error');
			setLoading(false);
		});
	}
});



