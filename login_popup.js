// popup.js
document.addEventListener('DOMContentLoaded', () => {
	const messageDiv = document.getElementById('message');
	const emailInput = document.getElementById('email');
	
	function requestMagicLink() {
		const inputemail = emailInput.value;
		if (!inputemail) {
			messageDiv.innerText = 'Please enter an email';
			return;
		}
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
				messageDiv.innerText = 'Log in successful';
				console.log('log in successfull', data.authenticated);
				mergeSyncAndUpdateChromeStorage(email, {});
				chrome.runtime.sendMessage({ action: "updateTasksToDoAfterLogin", data: email });
				closePopup(2000);
			}
		} catch (error) {
			console.error('Error syncing data:', error);
			throw error;
		}
	}

	document.getElementById('requestButton').addEventListener('click', requestMagicLink);

	function closePopup(delay) {
		setTimeout(() => {
			window.close();
		}, delay); // Delay as parameter
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
					} else {
						console.log("Data saved successfully from Login_popup.js:", updatedData);
					}
				});
			})
			.catch(error => {
				console.error('Failed to sync:', error);
			});
	}

	function requestMagicLinkForEmail(mail) {
		fetch('http://localhost:8080/api/request_magic_link', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ inputemail: mail })
		})
		.then(res => res.json())
		.then(data => {
			messageDiv.innerText = data.message + ' check your email!';
			console.log("magic link is sent");
			const pollInterval = setInterval(() => checkAuthStatus(mail), 300);
			checkAuthStatus(mail); // Initial call with parameter
		});
	}
});



