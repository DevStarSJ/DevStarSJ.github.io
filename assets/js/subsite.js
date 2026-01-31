// Subsite JavaScript
(function() {
  'use strict';

  // Mobile Navigation Toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      
      // Toggle hamburger animation
      const spans = navToggle.querySelectorAll('span');
      spans.forEach(span => span.classList.toggle('active'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        navMenu.classList.remove('active');
      });
    });
  }

  // Smooth scroll for TOC links
  document.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Active TOC link highlighting
  const tocLinks = document.querySelectorAll('.toc-link');
  const headings = [];

  tocLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const heading = document.querySelector(href);
      if (heading) {
        headings.push({ link, heading });
      }
    }
  });

  if (headings.length > 0) {
    const updateActiveTocLink = () => {
      const scrollPos = window.scrollY + 100;
      
      let activeHeading = headings[0];
      
      for (const item of headings) {
        if (item.heading.offsetTop <= scrollPos) {
          activeHeading = item;
        } else {
          break;
        }
      }

      tocLinks.forEach(link => link.classList.remove('active'));
      if (activeHeading) {
        activeHeading.link.classList.add('active');
      }
    };

    window.addEventListener('scroll', updateActiveTocLink, { passive: true });
    updateActiveTocLink();
  }

  // Add IDs to headings for TOC if not present
  document.querySelectorAll('.post-content h2, .post-content h3').forEach((heading, index) => {
    if (!heading.id) {
      const text = heading.textContent.trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-|-$/g, '');
      heading.id = id || `heading-${index}`;
    }
  });

  // Lazy load images
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // External links open in new tab
  document.querySelectorAll('.post-content a, .page-content a').forEach(link => {
    if (link.hostname !== window.location.hostname && !link.getAttribute('target')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  console.log('Subsite JS loaded');
})();
