/**
 * script.js - Handles the welcome page functionality
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const elements = {
        gifs: document.querySelectorAll(".gif"),
        tipText: document.getElementById("tip-text"),
        nextBtn: document.getElementById("next-btn"),
        closeBtn: document.getElementById("close-btn")
    };
    
    // Tips content
    const tips = [
        "<strong>Tip 1: Activate It</strong> - Click the extension icon on chatgpt.com to get started.",
        "<strong>Tip 2: Summarize Responses</strong> - Press 'Summarize' to shorten long answers.",
        "<strong>Tip 3: Quick Toggle</strong> - Use Ctrl+Shift+E to turn it on/off fast."
    ];
    
    // State management
    let currentIndex = 0;

    /**
     * Show the next GIF and tip
     */
    function nextGif() {
        // Hide current GIF
        elements.gifs[currentIndex].classList.remove("active");
        
        // Move to next GIF
        currentIndex = (currentIndex + 1) % elements.gifs.length;
        
        // Show next GIF and tip
        elements.gifs[currentIndex].classList.add("active");
        elements.tipText.innerHTML = tips[currentIndex];
    }

    // Event listeners
    elements.nextBtn.addEventListener("click", nextGif);
    elements.closeBtn.addEventListener("click", () => window.close());
});