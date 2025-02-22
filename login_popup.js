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
			console.log("All stored data:", stored_data	);
			if (stored_data.hasOwnProperty('useremail') && stored_data.useremail === inputemail) {
				console.log("User exists - checking auth status");
				checkAuthStatus(inputemail);
			} else {
				console.log("Email changed - requesting new magic link");
				requestMagicLinkForEmail(inputemail);
			}
		});

		

	};


	async function checkAuthStatus(email) {

		try {
            const response = await fetch(`http://localhost:8080/api/get_auth_status?email=${encodeURIComponent(email)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

			console.log(response);
			
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
			console.log(data.authenticated);
			if (data.authenticated == true){
				messageDiv.innerText = 'log in successful';
				handleSyncAndUpdate(email);
				closePopup(3000);
			}

        } catch (error) {
            console.error('Error syncing data:', error);
            throw error;
        }

         
	
	

	}
  

  	document.getElementById('requestButton').addEventListener('click', requestMagicLink);

	function clearExtentionstorage(){
		chrome.storage.sync.clear(() => {
			if (chrome.runtime.lastError) {
				console.error("Error clearing storage:", chrome.runtime.lastError);
			} else {
				console.log("Sync storage cleared!");
			}
		});
		
	}

	function closePopup(delay) {
		setTimeout(() => {
		window.close();
		}, delay); // Delay as parameter
	}



    // Function to sync data with the server
	async function syncData(email) {
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



	function handleSyncAndUpdate(useremail, existingData) {
		syncData(useremail)
			.then(userData => {
				const updatedData = {
					...existingData,
					...userData
				};
				
				chrome.storage.sync.set(updatedData, () => {
					if (chrome.runtime.lastError) {
						console.error("Error saving data:", chrome.runtime.lastError);
					} else {
						console.log("Data saved successfully:", updatedData);
					}
				});
			})
			.catch(error => {
				console.error('Failed to sync:', error);
			});
		
		chrome.storage.sync.get(['useremail', 'paid_user' , 'user_settings'], ({useremail, paid_user, user_settings}) => {
			console.log('useremail', useremail);
			console.log('paid_user', paid_user);
			console.log('user settings',user_settings)
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
			const pollInterval = setInterval(() => checkAuthStatus(mail), 5000);
			checkAuthStatus(mail); // Initial call with parameter
		});
	}

  // Call the function to send the button text
  
});