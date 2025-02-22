function createButton() {
    const button = document.createElement('button');
    button.textContent = 'Button'; // Initial button text
    button.id = 'my-custom-button'; // ID used for reference
    

    return button;
}

function addButton() {
    document.body.appendChild(createButton());
    console.log('Button added with CSS styling');
}

// Function to update the button text
function updateButtonText(newText) {
    const button = document.getElementById('my-custom-button');
    if (button) {
        button.textContent = newText; // Update button text
    }
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateButtonText") {
        updateButtonText(request.text); // Call the function to update the button text
    }
});

// Run the function when the page loads
addButton();


document.getElementById("my-custom-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openpopup" });
});



