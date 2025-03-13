document.addEventListener("DOMContentLoaded", () => {
    const gifs = document.querySelectorAll(".gif");
    const tipText = document.getElementById("tip-text");
    const nextBtn = document.getElementById("next-btn");
    const closeBtn = document.getElementById("close-btn");
    const tips = [
        "<strong>Tip 1: Activate It</strong> - Click the extension icon on chatgpt.com to get started.",
        "<strong>Tip 2: Summarize Responses</strong> - Press 'Summarize' to shorten long answers.",
        "<strong>Tip 3: Quick Toggle</strong> - Use Ctrl+Shift+E to turn it on/off fast."
    ];
    let currentIndex = 0;

    function nextGif() {
        gifs[currentIndex].classList.remove("active");
        currentIndex = (currentIndex + 1) % gifs.length;
        gifs[currentIndex].classList.add("active");
        tipText.innerHTML = tips[currentIndex];
    }

    nextBtn.addEventListener("click", nextGif);
    closeBtn.addEventListener("click", () => window.close());
});