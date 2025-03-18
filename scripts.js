// Basic interactivity
document.querySelector('.hero-btn').addEventListener('click', () => {
    alert('Download button clicked! Customize this action.');
});

document.querySelectorAll('.pricing-item button').forEach(button => {
    button.addEventListener('click', () => {
        alert('Pricing plan selected! Add your logic here.');
    });
});

// Typing effect for hero text
document.addEventListener('DOMContentLoaded', () => {
    // Typing animation for hero subtitle
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        const text = heroSubtitle.textContent;
        heroSubtitle.innerHTML = '<span class="typing-text"></span>';
        const typingText = document.querySelector('.typing-text');
        
        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                typingText.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 30);
            }
        }
        
        setTimeout(typeWriter, 1000);
    }
    
    // Scroll animations
    const fadeElems = document.querySelectorAll('.fade-in');
    
    function checkFade() {
        fadeElems.forEach(elem => {
            const elemTop = elem.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elemTop < windowHeight - 100) {
                elem.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', checkFade);
    checkFade(); // Initial check
    
    // Animated counters for stats
    const statNumbers = document.querySelectorAll('.stat-number');
    
    function animateCounter(el) {
        const target = parseInt(el.getAttribute('data-target'));
        const text = el.textContent;
        let suffix = '';
        
        // Extract suffix like K+ or /5
        if (text.includes('K')) suffix = 'K+';
        else if (text.includes('/')) suffix = '/5';
        
        let current = 0;
        const increment = target / 40;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target + suffix;
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current) + suffix;
            }
        }, 30);
    }
    
    // Initialize pricing toggle
    const monthlyToggle = document.getElementById('monthly-toggle');
    const yearlyToggle = document.getElementById('yearly-toggle');
    const pricingToggle = document.getElementById('pricing-toggle');
    
    if (pricingToggle) {
        pricingToggle.addEventListener('change', () => {
            const isYearly = pricingToggle.checked;
            
            document.querySelectorAll('.monthly-price').forEach(el => {
                el.style.display = isYearly ? 'none' : 'flex';
            });
            
            document.querySelectorAll('.yearly-price').forEach(el => {
                el.style.display = isYearly ? 'flex' : 'none';
            });
            
            if (monthlyToggle && yearlyToggle) {
                monthlyToggle.classList.toggle('active', !isYearly);
                yearlyToggle.classList.toggle('active', isYearly);
            }
        });
    }
    
    // Initialize scroll animations
    const observerOptions = {
        threshold: 0.15
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // If this is a stat number, animate it
                if (entry.target.classList.contains('stat-number')) {
                    animateCounter(entry.target);
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Add elements to be observed
    document.querySelectorAll('.fade-in, .stat-number').forEach(el => {
        observer.observe(el);
    });
});

// Particle background effect for hero section
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random positioning
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Random size
        const size = Math.random() * 5 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random animation duration
        particle.style.animationDuration = Math.random() * 5 + 5 + 's';
        
        hero.appendChild(particle);
    }
}

document.addEventListener('DOMContentLoaded', createParticles);