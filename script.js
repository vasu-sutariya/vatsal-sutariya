// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Contact form handling -> open email client (mailto)
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = this.querySelector('input[type="text"]').value.trim();
        const email = this.querySelector('input[type="email"]').value.trim();
        const message = this.querySelector('textarea').value.trim();

        if (!name || !email || !message) {
            alert('Please fill in all fields');
            return;
        }

        const subject = encodeURIComponent(`Portfolio message from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        const mailto = `mailto:vasutariya2025@gmail.com?subject=${subject}&body=${body}`;

        window.location.href = mailto;
        this.reset();
    });
}

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.project-card, .about-content, .contact-content');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText, 50);
    }
});

// Rover functionality
class Rover {
    constructor() {
        this.rover = document.getElementById('rover');
        this.speechBubble = document.getElementById('rover-speech');
        this.isFollowing = false;
        this.initialPosition = null;
        // Bind once for stable add/removeEventListener
        this.boundUpdateTarget = this.updateTarget.bind(this);
        // Track original DOM placement to restore later
        this.originalParent = null;
        this.originalNextSibling = null;
        
        // Physics properties
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.maxVelocity = 3; // pixels per frame
        this.acceleration = 0.15; // how quickly it accelerates
        this.friction = 0.85; // how quickly it slows down
        this.animationId = null;
        
        this.init();
    }

    init() {
        // Show speech bubble after 2 seconds
        setTimeout(() => {
            this.showSpeechBubble();
        }, 2000);

        // Hide speech bubble after 5 seconds
        setTimeout(() => {
            this.hideSpeechBubble();
        }, 5000);

        // Start following mouse after 8 seconds
        setTimeout(() => {
            this.startFollowing();
        }, 6000);

        // Add click event to toggle following
        this.rover.addEventListener('click', () => {
            if (this.isFollowing) {
                this.stopFollowing();
            } else {
                this.startFollowing();
            }
        });
    }

    showSpeechBubble() {
        this.speechBubble.classList.add('show');
    }

    hideSpeechBubble() {
        this.speechBubble.classList.remove('show');
    }

    startFollowing() {
        this.isFollowing = true;
        
        // Capture position BEFORE switching context to avoid jump
        const preRect = this.rover.getBoundingClientRect();
        const preCenterX = preRect.left + preRect.width / 2;
        const preCenterY = preRect.top + preRect.height / 2;

        // Reparent to body so position: fixed is relative to viewport, not transformed ancestor
        this.originalParent = this.rover.parentNode;
        this.originalNextSibling = this.rover.nextSibling;
        document.body.appendChild(this.rover);

        // Switch to fixed inline and place exactly where it was on screen
        this.rover.style.position = 'fixed';
        this.rover.style.left = preRect.left + 'px';
        this.rover.style.top = preRect.top + 'px';
        this.rover.classList.add('following');
        
        // Store initial position for reset
        if (!this.initialPosition) {
            this.initialPosition = {
                x: preRect.left,
                y: preRect.top
            };
        }

        // Initialize position - get current center position after adding 'following' class
        // Initialize physics position from pre-fixed center
        this.position.x = preCenterX;
        this.position.y = preCenterY;
        
        // Set initial target to current position so it doesn't jump
        this.targetPosition.x = this.position.x;
        this.targetPosition.y = this.position.y;
        
        console.log('Starting follow - Initial position:', this.position.x, this.position.y);

        // Set inline position immediately to avoid any jump
        this.rover.style.left = (this.position.x - preRect.width / 2) + 'px';
        this.rover.style.top = (this.position.y - preRect.height / 2) + 'px';
        
        // Add mouse move listener
        document.addEventListener('mousemove', this.boundUpdateTarget);
        
        // Start animation loop
        this.animate();
        
        // Add some rover personality
        this.rover.style.cursor = 'none';
    }

    stopFollowing() {
        this.isFollowing = false;
        this.rover.classList.remove('following');
        this.rover.style.cursor = 'pointer';
        
        // Remove mouse move listener
        document.removeEventListener('mousemove', this.boundUpdateTarget);
        
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Restore to original DOM placement
        if (this.originalParent) {
            if (this.originalNextSibling) {
                this.originalParent.insertBefore(this.rover, this.originalNextSibling);
            } else {
                this.originalParent.appendChild(this.rover);
            }
        }

        // Clear inline positioning so layout returns to normal
        this.rover.style.position = '';
        this.rover.style.left = '';
        this.rover.style.top = '';
    }

    updateTarget(e) {
        if (!this.isFollowing) return;
        
        // Set target position to mouse cursor (rover will center itself)
        this.targetPosition.x = e.clientX;
        this.targetPosition.y = e.clientY;
        
        // Debug: Log positions
        console.log('Mouse position:', e.clientX, e.clientY);
        console.log('Target position:', this.targetPosition.x, this.targetPosition.y);
        console.log('Rover position:', this.position.x, this.position.y);
        
        // Debug: Show target visually
        this.showDebugTarget();
    }

    animate() {
        if (!this.isFollowing) return;
        
        // Get current rover position from DOM
        const roverRect = this.rover.getBoundingClientRect();
        const roverWidth = roverRect.width;
        const roverHeight = roverRect.height;
        
        // Calculate current center position of rover
        const currentCenterX = roverRect.left + roverWidth / 2;
        const currentCenterY = roverRect.top + roverHeight / 2;
        
        // Calculate distance to target
        const dx = this.targetPosition.x - currentCenterX;
        const dy = this.targetPosition.y - currentCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if we're not already at the target
        if (distance > 2) {
            // Calculate desired velocity towards target
            const desiredVelocityX = (dx / distance) * this.maxVelocity;
            const desiredVelocityY = (dy / distance) * this.maxVelocity;
            
            // Apply acceleration towards desired velocity
            this.velocity.x += (desiredVelocityX - this.velocity.x) * this.acceleration;
            this.velocity.y += (desiredVelocityY - this.velocity.y) * this.acceleration;
            
            // Apply friction
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            
            // Update position
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            
            // Update rover position - center it on the target
            this.rover.style.left = (this.position.x - roverWidth / 2) + 'px';
            this.rover.style.top = (this.position.y - roverHeight / 2) + 'px';
            
            // Adjust wheel animation speed based on velocity
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            const wheels = this.rover.querySelectorAll('.wheel');
            wheels.forEach(wheel => {
                if (speed > 0.1) {
                    wheel.style.animationDuration = Math.max(0.2, 1 - speed / 5) + 's';
                } else {
                    wheel.style.animationDuration = '2s';
                }
            });
            
            // Debug: Log current positions
            console.log('Distance to target:', distance);
            console.log('Current center:', currentCenterX, currentCenterY);
            console.log('Target:', this.targetPosition.x, this.targetPosition.y);
            console.log('Velocity:', this.velocity.x, this.velocity.y);
        }
        
        // Continue animation loop
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    showDebugTarget() {
        // Remove existing debug target
        const existingTarget = document.getElementById('debug-target');
        if (existingTarget) {
            existingTarget.remove();
        }
        
        // Create new debug target
        const debugTarget = document.createElement('div');
        debugTarget.id = 'debug-target';
        debugTarget.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: red;
            border: 2px solid yellow;
            border-radius: 50%;
            z-index: 10000;
            pointer-events: none;
            left: ${this.targetPosition.x - 10}px;
            top: ${this.targetPosition.y - 10}px;
        `;
        document.body.appendChild(debugTarget);
        
        // Remove after 1 second
        setTimeout(() => {
            if (debugTarget.parentNode) {
                debugTarget.remove();
            }
        }, 1000);
    }
}

// Initialize rover when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Rover();
});
