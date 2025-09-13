// Performance optimized initialization
(function() {
    'use strict';

    // Critical path - execute immediately
    initializeNavigation();
    initializeMobileMenu();

    // Non-critical - defer until page is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNonCritical);
    } else {
        // DOM already loaded
        initializeNonCritical();
    }

    function initializeNonCritical() {
        requestIdleCallback(function() {
            initializeScrollEffects();
            initializeCodeTabs();
            initializeAnimations();
        });

        // Defer heavy animations
        setTimeout(function() {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(initializeParallax);
            } else {
                initializeParallax();
            }
        }, 100);
    }
})();

// Navigation functionality
function initializeNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 70; // Account for navbar height

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Update active link
                    updateActiveNavLink(targetId.substring(1));

                    // Close mobile menu if open
                    closeMobileMenu();
                }
            }
        });
    });

    // Throttled scroll spy for navigation
    let scrollTicking = false;
    window.addEventListener('scroll', function() {
        if (!scrollTicking) {
            requestAnimationFrame(handleScroll);
            scrollTicking = true;
        }
    });

    function handleScroll() {
        scrollTicking = false;
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                updateActiveNavLink(sectionId);
            }
        });

        // Add scrolled class to navbar
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}

function updateActiveNavLink(activeId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${activeId}`) {
            link.classList.add('active');
        }
    });
}

// Mobile menu functionality
function initializeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            closeMobileMenu();
        }
    });
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}

// Optimized scroll effects and animations
function initializeScrollEffects() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Progressive element selection to reduce DOM queries
    requestIdleCallback(function() {
        const animatedElements = document.querySelectorAll('.feature-card, .model-card, .benchmark-metric, .doc-card');
        animatedElements.forEach(el => {
            // Add fade-in class initially
            el.classList.add('fade-in');
            observer.observe(el);
        });
    });
}

// Code tabs functionality
function initializeCodeTabs() {
    const codeTabs = document.querySelectorAll('.code-tab');
    const codeBlocks = document.querySelectorAll('.code-block');

    codeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and blocks
            codeTabs.forEach(t => t.classList.remove('active'));
            codeBlocks.forEach(block => block.classList.remove('active'));

            // Add active class to clicked tab and corresponding block
            this.classList.add('active');
            const targetBlock = document.getElementById(targetTab);
            if (targetBlock) {
                targetBlock.classList.add('active');
            }
        });
    });
}

// Optimized animation utilities
function initializeAnimations() {
    // Trigger progressive loading state
    document.documentElement.style.setProperty('--load-state', '1');

    // Skip heavy animations on slower devices
    const isLowPowerDevice = navigator.hardwareConcurrency <= 2 ||
                            navigator.deviceMemory <= 2 ||
                            /Android.*Chrome\/([0-7]\d|8[01])/.test(navigator.userAgent);

    if (isLowPowerDevice) {
        document.body.classList.add('reduced-motion');
        return;
    }

    // Enable will-change for active elements only
    const enableWillChange = (elements) => {
        elements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.willChange = 'transform';
            }, { once: true });

            el.addEventListener('animationend', () => {
                el.style.willChange = 'auto';
            }, { once: true });
        });
    };

    requestIdleCallback(() => {
        const hoverElements = document.querySelectorAll('.feature-card, .model-card, .doc-card');
        enableWillChange(hoverElements);
    });
}

// Optimized parallax effects
function initializeParallax() {
    // Skip parallax on mobile or low-power devices
    if (window.innerWidth < 768 ||
        ('ontouchstart' in window) ||
        navigator.hardwareConcurrency <= 2) {
        return;
    }

    let ticking = false;
    const parallaxElements = document.querySelectorAll('.wave-animation');

    // Cache element references
    if (parallaxElements.length === 0) return;

    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.3; // Reduced intensity

        parallaxElements.forEach(element => {
            element.style.transform = `translate3d(0, ${rate}px, 0)`;
        });

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Use passive event listener
    window.addEventListener('scroll', requestTick, { passive: true });
}

// Utility functions
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimizations
function initializePerformanceOptimizations() {
    // Lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    // Preload critical resources
    const criticalResources = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
    ];

    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = 'style';
        document.head.appendChild(link);
    });
}

// Error handling
window.addEventListener('error', function(e) {
    console.warn('JavaScript error occurred:', e.error);
});

// Feature detection
function supportsFeature(feature) {
    switch (feature) {
        case 'intersectionObserver':
            return 'IntersectionObserver' in window;
        case 'smoothScroll':
            return 'scrollBehavior' in document.documentElement.style;
        case 'cssGrid':
            return CSS.supports('display', 'grid');
        default:
            return false;
    }
}

// Fallbacks for older browsers
if (!supportsFeature('smoothScroll')) {
    // Polyfill for smooth scrolling
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 70;

                    // Smooth scroll polyfill
                    const start = window.pageYOffset;
                    const distance = offsetTop - start;
                    const duration = 800;
                    let startTime = null;

                    function animation(currentTime) {
                        if (startTime === null) startTime = currentTime;
                        const timeElapsed = currentTime - startTime;
                        const run = ease(timeElapsed, start, distance, duration);
                        window.scrollTo(0, run);
                        if (timeElapsed < duration) requestAnimationFrame(animation);
                    }

                    function ease(t, b, c, d) {
                        t /= d / 2;
                        if (t < 1) return c / 2 * t * t + b;
                        t--;
                        return -c / 2 * (t * (t - 2) - 1) + b;
                    }

                    requestAnimationFrame(animation);
                }
            }
        });
    });
}

// Initialize performance optimizations after DOM load
document.addEventListener('DOMContentLoaded', initializePerformanceOptimizations);

// Analytics and tracking (placeholder)
function trackEvent(category, action, label) {
    // Placeholder for analytics tracking
    console.log('Track event:', category, action, label);
}

// Track important interactions
document.addEventListener('click', function(e) {
    if (e.target.matches('.btn-primary')) {
        trackEvent('CTA', 'click', 'Primary Button');
    }
    if (e.target.matches('.github-link')) {
        trackEvent('Navigation', 'click', 'GitHub Link');
    }
    if (e.target.matches('.model-link')) {
        trackEvent('Models', 'click', 'Download Model');
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMobileMenu();
    }

    // Tab navigation enhancement
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', function() {
    document.body.classList.remove('keyboard-navigation');
});

// Add keyboard navigation styles
const keyboardStyle = document.createElement('style');
keyboardStyle.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid var(--primary-color) !important;
        outline-offset: 2px !important;
    }
`;
document.head.appendChild(keyboardStyle);

console.log('ChanFM website loaded successfully! 📡');