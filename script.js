// Default obstacle configuration - can be modified directly in this file
const DEFAULT_OBSTACLES = [
  {
    "left": 187,
    "top": 229,
    "width": 323,
    "height": 300
  },
  {
    "left": 486,
    "top": 368,
    "width": 232,
    "height": 31
  },
  {
    "left": 1,
    "top": 5,
    "width": 1517,
    "height": 62
  },
  {
    "left": 667,
    "top": 825,
    "width": 187,
    "height": 51
  },
  {
    "left": 357,
    "top": 934,
    "width": 768,
    "height": 157
  },
  {
    "left": 356,
    "top": 1087,
    "width": 710,
    "height": 128
  },
  {
    "left": 553,
    "top": 1377,
    "width": 421,
    "height": 46
  },
  {
    "left": 176,
    "top": 1473,
    "width": 1165,
    "height": 474
  },
  {
    "left": 573,
    "top": 2099,
    "width": 376,
    "height": 98
  },
  {
    "left": 180,
    "top": 2193,
    "width": 1168,
    "height": 444
  },
  {
    "left": 633,
    "top": 2796,
    "width": 251,
    "height": 412
  },
  {
    "left": 253,
    "top": 2885,
    "width": 1012,
    "height": 328
  },
  {
    "left": -1,
    "top": 3284,
    "width": 1541,
    "height": 120
  }
];

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
        this.boundRecomputeObstacles = this.recomputeObstacles.bind(this);
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

        // Obstacle avoidance
        // Only user-defined obstacles (via API/editor)
        this.obstacleSelectors = [ '[data-none]' ];
        this.obstacles = [];
        // Manual/custom obstacles API storage
        this.manualRects = []; // viewport-space rectangles {left, top, width, height, padding?}
        this.manualDocRects = []; // document-space rectangles; converted each frame
        this.manualElements = new Map(); // Element -> padding
        // Extra clearance so rover does not visually touch obstacles
        this.obstaclePadding = 10; // pixels
        // Throttle recomputation timing
        this.lastObstacleCompute = 0;
        this.obstacleComputeIntervalMs = 250;
        
        this.init();
    }

    init() {
        // Show speech bubble after 2 seconds
        setTimeout(() => {
            this.showSpeechBubble();
        }, 1000);

        // Hide speech bubble after 5 seconds
        setTimeout(() => {
            this.hideSpeechBubble();
        }, 7000);

        // Start following mouse after 8 seconds
        setTimeout(() => {
            this.startFollowing();
        }, 8000);

        // Add click event to toggle following
        this.rover.addEventListener('click', () => {
            if (this.isFollowing) {
                this.stopFollowing();
            } else {
                this.startFollowing();
            }
        });

        // Expose API immediately so obstacles can be loaded
        this.exposeApi();
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
        window.addEventListener('scroll', this.boundRecomputeObstacles, { passive: true });
        window.addEventListener('resize', this.boundRecomputeObstacles);
        // Initial obstacles snapshot
        this.recomputeObstacles(true);
        
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
        window.removeEventListener('scroll', this.boundRecomputeObstacles);
        window.removeEventListener('resize', this.boundRecomputeObstacles);
        
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
        let tx = e.clientX;
        let ty = e.clientY;

        // Clamp target to be outside obstacles (inflated by rover half-size)
        const roverRect = this.rover.getBoundingClientRect();
        const inflatedObstacles = this.getInflatedObstacles(roverRect.width / 2, roverRect.height / 2);
        const clamped = this.clampPointOutsideRects({ x: tx, y: ty }, inflatedObstacles);
        this.targetPosition.x = clamped.x;
        this.targetPosition.y = clamped.y;
        
        // Debug: Log positions
        console.log('Mouse position:', e.clientX, e.clientY);
        console.log('Target position:', this.targetPosition.x, this.targetPosition.y);
        console.log('Rover position:', this.position.x, this.position.y);
        
        // Debug: Show target visually
        this.showDebugTarget();
    }

    animate() {
        if (!this.isFollowing) return;
        
        // Occasionally refresh obstacles while animating
        this.recomputeObstacles();
        
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
            
            // Collision resolution: prevent rover from entering obstacles
            const afterMoveRect = {
                left: this.position.x - roverWidth / 2,
                top: this.position.y - roverHeight / 2,
                width: roverWidth,
                height: roverHeight
            };
            const inflatedObstacles = this.getInflatedObstacles(0, 0, this.obstaclePadding);
            const resolved = this.resolveRectOutsideObstacles(afterMoveRect, inflatedObstacles);
            if (resolved.collided) {
                // Reduce velocity on collision for a soft stop
                this.velocity.x *= -0.2;
                this.velocity.y *= -0.2;
                // Update position from resolved rect center
                this.position.x = resolved.rect.left + roverWidth / 2;
                this.position.y = resolved.rect.top + roverHeight / 2;
            }

            // Update rover position - center it on the target (or resolved)
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
    
    // ------------------- Obstacle utilities -------------------
    recomputeObstacles(force = false) {
        const now = performance.now();
        if (!force && (now - this.lastObstacleCompute) < this.obstacleComputeIntervalMs) return;
        this.lastObstacleCompute = now;

        const selector = this.obstacleSelectors.join(',');
        const nodes = Array.from(document.querySelectorAll(selector));

        const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom >= 0 && r.right >= 0 && r.top <= window.innerHeight && r.left <= window.innerWidth;
        };

        // Build obstacle list in viewport; exclude rover and its bubble
        const taggedRects = nodes
            .filter(el => el !== this.rover && el !== this.speechBubble && isVisible(el))
            .map(el => {
                const r = el.getBoundingClientRect();
                const padAttr = el.getAttribute('data-rover-padding');
                const padding = padAttr != null ? Number(padAttr) : 0;
                return { left: r.left, top: r.top, width: r.width, height: r.height, padding };
            });

        // Manual element obstacles (live rects)
        const manualElementRects = Array.from(this.manualElements.entries()).map(([el, padding]) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, top: r.top, width: r.width, height: r.height, padding: Number(padding) || 0 };
        });

        // Manual static rects are already viewport-aligned
        const manualStaticRects = this.manualRects.slice();

        // Convert document-space rects to viewport-space by subtracting current scroll
        const scrollX = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const manualFromDoc = this.manualDocRects.map(r => ({
            left: r.left - scrollX,
            top: r.top - scrollY,
            width: r.width,
            height: r.height,
            padding: Number(r.padding) || 0
        }));

        this.obstacles = [...taggedRects, ...manualElementRects, ...manualStaticRects, ...manualFromDoc];
    }

    getInflatedObstacles(inflateX = 0, inflateY = 0, extraPadding = 0) {
        const padX = inflateX + extraPadding;
        const padY = inflateY + extraPadding;
        return this.obstacles.map(r => {
            const extra = Number(r.padding) || 0;
            return {
                left: r.left - (padX + extra),
                top: r.top - (padY + extra),
                width: r.width + 2 * (padX + extra),
                height: r.height + 2 * (padY + extra)
            };
        });
    }

    clampPointOutsideRects(point, rects) {
        let { x, y } = point;
        for (const r of rects) {
            const inside = x > r.left && x < (r.left + r.width) && y > r.top && y < (r.top + r.height);
            if (inside) {
                // Push to nearest edge
                const leftDist = Math.abs(x - r.left);
                const rightDist = Math.abs(r.left + r.width - x);
                const topDist = Math.abs(y - r.top);
                const bottomDist = Math.abs(r.top + r.height - y);
                const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
                if (minDist === leftDist) x = r.left - 0.01;
                else if (minDist === rightDist) x = r.left + r.width + 0.01;
                else if (minDist === topDist) y = r.top - 0.01;
                else y = r.top + r.height + 0.01;
            }
        }
        return { x, y };
    }

    rectsIntersect(a, b) {
        return !(a.left + a.width <= b.left ||
                 b.left + b.width <= a.left ||
                 a.top + a.height <= b.top ||
                 b.top + b.height <= a.top);
    }

    resolveRectOutsideObstacles(rect, obstacles) {
        let resolvedRect = { ...rect };
        let collided = false;
        for (const ob of obstacles) {
            if (!this.rectsIntersect(resolvedRect, ob)) continue;
            collided = true;
            // Compute minimal translation vector to push rect outside obstacle
            const leftPen = (resolvedRect.left + resolvedRect.width) - ob.left;
            const rightPen = (ob.left + ob.width) - resolvedRect.left;
            const topPen = (resolvedRect.top + resolvedRect.height) - ob.top;
            const bottomPen = (ob.top + ob.height) - resolvedRect.top;

            // Choose axis with minimal penetration
            const minHoriz = Math.min(leftPen, rightPen);
            const minVert = Math.min(topPen, bottomPen);
            if (minHoriz < minVert) {
                // Resolve horizontally
                if (leftPen < rightPen) {
                    // push left
                    resolvedRect.left = ob.left - resolvedRect.width - 0.01;
                } else {
                    // push right
                    resolvedRect.left = ob.left + ob.width + 0.01;
                }
            } else {
                // Resolve vertically
                if (topPen < bottomPen) {
                    // push up
                    resolvedRect.top = ob.top - resolvedRect.height - 0.01;
                } else {
                    // push down
                    resolvedRect.top = ob.top + ob.height + 0.01;
                }
            }
        }
        return { rect: resolvedRect, collided };
    }

    exposeApi() {
        if (window.RoverAPI) return; // do not overwrite if already present
        window.RoverAPI = {
            // Add a static rectangle in viewport coordinates
            addObstacleRect: (rect) => {
                // rect: { left, top, width, height, padding? }
                if (!rect || typeof rect.left !== 'number') return;
                this.manualRects.push({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    padding: Number(rect.padding) || 0
                });
                this.recomputeObstacles(true);
            },
            // Add a static rectangle in document (page) coordinates
            addObstacleRectDoc: (rect) => {
                if (!rect || typeof rect.left !== 'number') return;
                this.manualDocRects.push({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    padding: Number(rect.padding) || 0
                });
                this.recomputeObstacles(true);
            },
            // Clear all static rectangles
            clearObstacleRects: () => {
                this.manualRects = [];
                this.manualDocRects = [];
                this.recomputeObstacles(true);
            },
            // Register a DOM element as an obstacle with optional padding
            addObstacleElement: (el, padding = 0) => {
                if (!el || !(el instanceof Element)) return;
                this.manualElements.set(el, Number(padding) || 0);
                this.recomputeObstacles(true);
            },
            // Remove a DOM element obstacle
            removeObstacleElement: (el) => {
                if (!el || !(el instanceof Element)) return;
                this.manualElements.delete(el);
                this.recomputeObstacles(true);
            }
        };
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
    const rover = new Rover();
    
    // Auto-load obstacles from DEFAULT_OBSTACLES constant after rover is initialized
    if (DEFAULT_OBSTACLES && DEFAULT_OBSTACLES.length > 0) {
        console.log('Auto-loaded obstacles from DEFAULT_OBSTACLES:', DEFAULT_OBSTACLES);
        // Wait longer for RoverAPI to be available and rover to be fully initialized
        setTimeout(() => {
            if (window.RoverAPI && window.RoverAPI.addObstacleRectDoc) {
                window.RoverAPI.clearObstacleRects();
                DEFAULT_OBSTACLES.forEach(d => window.RoverAPI.addObstacleRectDoc(d));
                console.log('Loaded obstacles into rover');
            } else {
                console.warn('RoverAPI not available yet, retrying...');
                // Retry after another delay
                setTimeout(() => {
                    if (window.RoverAPI && window.RoverAPI.addObstacleRectDoc) {
                        window.RoverAPI.clearObstacleRects();
                        DEFAULT_OBSTACLES.forEach(d => window.RoverAPI.addObstacleRectDoc(d));
                        console.log('Loaded obstacles into rover (retry)');
                    }
                }, 1000);
            }
        }, 500);
    }
    
    initObstacleEditor(rover);
});

// ------------------- Obstacle Editor UI -------------------
function initObstacleEditor(roverInstance) {
    const toggleBtn = document.getElementById('obst-editor-toggle');
    const overlay = document.getElementById('obst-editor-overlay');
    const toolbar = document.getElementById('obst-editor-toolbar');
    if (!toggleBtn || !overlay || !toolbar) return;

    let active = false;
    let rects = []; // {el, left, top, width, height}

    const syncToRover = () => {
        if (!window.RoverAPI) return;
        window.RoverAPI.clearObstacleRects();
        rects.forEach(r => {
            // Use document (page) coordinates recorded on the element dataset
            const left = parseFloat(r.el.dataset.docLeft);
            const top = parseFloat(r.el.dataset.docTop);
            const width = r.el.offsetWidth;
            const height = r.el.offsetHeight;
            // Convert to viewport at runtime inside Rover.recomputeObstacles, so here we pass as-is
            // But RoverAPI.addObstacleRect expects viewport values; instead we store document rects
            // in manualRects by extending the API to accept doc coords. We'll convert there.
            if (window.RoverAPI && window.RoverAPI.addObstacleRectDoc) {
                window.RoverAPI.addObstacleRectDoc({ left, top, width, height, padding: 0 });
            }
        });
    };

    const loadSavedIntoRover = () => {
        if (!window.RoverAPI) return;
        window.RoverAPI.clearObstacleRects();
        
        // Load from current rects array (editor rectangles)
        rects.forEach(r => {
            const left = parseFloat(r.el.dataset.docLeft);
            const top = parseFloat(r.el.dataset.docTop);
            const width = r.el.offsetWidth;
            const height = r.el.offsetHeight;
            if (window.RoverAPI.addObstacleRectDoc) {
                window.RoverAPI.addObstacleRectDoc({ left, top, width, height, padding: 0 });
            }
        });
        
        // Also load from DEFAULT_OBSTACLES (embedded obstacles)
        if (DEFAULT_OBSTACLES && DEFAULT_OBSTACLES.length > 0) {
            DEFAULT_OBSTACLES.forEach(d => {
                if (window.RoverAPI.addObstacleRectDoc) {
                    window.RoverAPI.addObstacleRectDoc(d);
                }
            });
        }
    };

    const show = () => {
        active = true;
        overlay.style.display = 'block';
        toolbar.style.display = 'flex';
        toggleBtn.textContent = 'Close Obstacles';
        // Keep existing layer and rectangles; rebuild only if empty
        if (!overlay.querySelector('[data-obst-layer]')) {
            overlay.appendChild(createRectsLayer());
        }
        syncToRover();
    };

    const hide = () => {
        active = false;
        // Keep rectangles in DOM so they persist visually (and for next open)
        overlay.style.display = 'none';
        toolbar.style.display = 'none';
        toggleBtn.textContent = 'Obstacles';
        // Keep obstacles active even when editor is closed
        loadSavedIntoRover();
    };

    toggleBtn.addEventListener('click', () => {
        if (active) hide(); else show();
    });

    document.getElementById('obst-add').addEventListener('click', () => {
        const layer = overlay.querySelector('[data-obst-layer]');
        if (!layer) return;
        const el = createRectEl(100, 100, 200, 120);
        layer.appendChild(el);
        rects.push({ el });
        syncToRover();
    });

    document.getElementById('obst-export').addEventListener('click', () => {
        // Export all rectangles' document coordinates to JSON file
        const data = rects.map(r => ({
            left: parseFloat(r.el.dataset.docLeft),
            top: parseFloat(r.el.dataset.docTop),
            width: r.el.offsetWidth,
            height: r.el.offsetHeight
        }));
        
        if (data.length === 0) {
            alert('No obstacles to export. Add some rectangles first!');
            return;
        }
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rover-obstacles.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Exported obstacles:', data);
    });

    document.getElementById('obst-import').addEventListener('click', () => {
        // Trigger file input
        const fileInput = document.getElementById('obst-file-input');
        fileInput.click();
    });

    document.getElementById('obst-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!Array.isArray(data)) {
                    alert('Invalid file format. Expected JSON array.');
                    return;
                }
                
                // Clear existing rectangles
                rects = [];
                overlay.innerHTML = '';
                const layer = createRectsLayer();
                overlay.appendChild(layer);
                
                // Add imported rectangles
                data.forEach(d => {
                    if (typeof d.left === 'number' && typeof d.top === 'number' && 
                        typeof d.width === 'number' && typeof d.height === 'number') {
                        const el = createRectEl(d.left, d.top, d.width, d.height);
                        el.classList.add('hidden-saved');
                        layer.appendChild(el);
                        rects.push({ el });
                    }
                });
                
                // Sync to rover
                syncToRover();
                console.log('Imported obstacles:', data);
                
            } catch (error) {
                alert('Failed to parse JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    });

    document.getElementById('obst-clear').addEventListener('click', () => {
        rects = [];
        overlay.innerHTML = '';
        overlay.appendChild(createRectsLayer());
        if (window.RoverAPI) {
            window.RoverAPI.clearObstacleRects();
        }
    });

    window.addEventListener('resize', () => {
        if (active) {
            syncToRover();
        } else {
            loadSavedIntoRover();
        }
    });
    window.addEventListener('scroll', () => {
        if (active) {
            syncToRover();
        } else {
            loadSavedIntoRover();
        }
    }, { passive: true });

    function createRectsLayer() {
        const layer = document.createElement('div');
        layer.setAttribute('data-obst-layer', '');
        layer.style.position = 'absolute';
        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) + 'px';
        layer.style.height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) + 'px';
        
        // Auto-load obstacles from DEFAULT_OBSTACLES constant
        if (DEFAULT_OBSTACLES && DEFAULT_OBSTACLES.length > 0) {
            console.log('Auto-loaded obstacles into editor:', DEFAULT_OBSTACLES);
            DEFAULT_OBSTACLES.forEach(d => {
                if (typeof d.left === 'number' && typeof d.top === 'number' && 
                    typeof d.width === 'number' && typeof d.height === 'number') {
                    const el = createRectEl(d.left, d.top, d.width, d.height);
                    el.classList.add('hidden-saved');
                    layer.appendChild(el);
                    rects.push({ el });
                }
            });
            // Sync once after loading
            setTimeout(syncToRover, 0);
        }
        
        return layer;
    }

    function createRectEl(left, top, width, height) {
        const el = document.createElement('div');
        el.className = 'obst-rect';
        setBox(el, left, top, width, height);
        // Store document coords in dataset
        el.dataset.docLeft = String(left);
        el.dataset.docTop = String(top);

        // Handles
        const handles = ['nw','n','ne','e','se','s','sw','w'];
        handles.forEach(h => {
            const hx = document.createElement('div');
            hx.className = 'obst-handle ' + h;
            el.appendChild(hx);
        });

        // Dragging
        let drag = null; // {startX, startY, startLeft, startTop}
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('obst-handle')) return; // resize handles handled separately
            e.preventDefault();
            drag = { startX: e.clientX, startY: e.clientY, startLeft: parseFloat(el.dataset.docLeft), startTop: parseFloat(el.dataset.docTop) };
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd, { once: true });
        });

        function onDragMove(e) {
            if (!drag) return;
            const nl = drag.startLeft + (e.clientX - drag.startX);
            const nt = drag.startTop + (e.clientY - drag.startY);
            setBox(el, nl, nt, el.offsetWidth, el.offsetHeight);
            el.dataset.docLeft = String(nl);
            el.dataset.docTop = String(nt);
            syncToRover();
        }
        function onDragEnd() {
            drag = null;
            window.removeEventListener('mousemove', onDragMove);
        }

        // Resizing
        let rs = null; // {edge, startX, startY, startBox}
        el.querySelectorAll('.obst-handle').forEach(h => {
            h.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const edge = [...h.classList].find(c => ['nw','n','ne','e','se','s','sw','w'].includes(c));
                rs = { edge, startX: e.clientX, startY: e.clientY, startBox: { left: parseFloat(el.dataset.docLeft), top: parseFloat(el.dataset.docTop), width: el.offsetWidth, height: el.offsetHeight } };
                window.addEventListener('mousemove', onResizeMove);
                window.addEventListener('mouseup', onResizeEnd, { once: true });
            });
        });

        function onResizeMove(e) {
            if (!rs) return;
            const dx = e.clientX - rs.startX;
            const dy = e.clientY - rs.startY;
            let { left, top, width, height } = rs.startBox;
            switch (rs.edge) {
                case 'nw': left += dx; top += dy; width -= dx; height -= dy; break;
                case 'n': top += dy; height -= dy; break;
                case 'ne': top += dy; width += dx; height -= dy; break;
                case 'e': width += dx; break;
                case 'se': width += dx; height += dy; break;
                case 's': height += dy; break;
                case 'sw': left += dx; width -= dx; height += dy; break;
                case 'w': left += dx; width -= dx; break;
            }
            width = Math.max(20, width);
            height = Math.max(20, height);
            setBox(el, left, top, width, height);
            el.dataset.docLeft = String(left);
            el.dataset.docTop = String(top);
            syncToRover();
        }
        function onResizeEnd() {
            rs = null;
            window.removeEventListener('mousemove', onResizeMove);
        }

        return el;
    }

    function setBox(el, left, top, width, height) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.width = width + 'px';
        el.style.height = height + 'px';
    }
}
