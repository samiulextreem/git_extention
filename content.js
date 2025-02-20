function createButton() {
    const button = document.createElement('button');
    button.textContent = 'Button'; // Button text
    button.id = 'my-custom-button'; // Matches CSS ID selector
    
    // Remove inline styles
    button.onclick = () => console.log('Clicked');
    return button;
}

function addButton() {
    document.body.appendChild(createButton());
    console.log('Button added with CSS styling');
}

// Run the function when the page loads
addButton();


