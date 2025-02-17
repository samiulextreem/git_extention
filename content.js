function addButton() {
    if (document.querySelector('.custom-chatgpt-button')) return;

    const button = document.createElement('button');
    button.className = 'custom-chatgpt-button';
    button.textContent = 'MY BUTTON';

    button.addEventListener('click', () => {
        console.log('Button clicked');
    });

    const targetElement = document.querySelector('nav');
    if (targetElement) {
        targetElement.appendChild(button);
    }
}

// Run the function when the page loads
addButton();


