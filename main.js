// ===== DROPDOWN "MÁS" =====
const dropdown = document.querySelector('.nav-dropdown');
const moreBtn = document.querySelector('.nav-more-btn');

if (moreBtn) {
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
  // Cerrar al elegir una opción
  dropdown.querySelectorAll('.dropdown-menu a').forEach(link => {
    link.addEventListener('click', () => dropdown.classList.remove('open'));
  });
}

// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ===== MENÚ MÓVIL =====
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  // animación hamburguesa → X
  navToggle.classList.toggle('active', open);
});

// cerrar menú al hacer click en un enlace
nav.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle.classList.remove('active');
  });
});

// cerrar menú al hacer click fuera
document.addEventListener('click', (e) => {
  if (!header.contains(e.target)) {
    nav.classList.remove('open');
    navToggle.classList.remove('active');
  }
});

// ===== ACTIVE NAV LINK con IntersectionObserver =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => observer.observe(s));

// ===== ANIMACIÓN DE ENTRADA (fade-in al scroll) =====
const animTargets = document.querySelectorAll(
  '.service-card, .why-card, .lens-card, .contact-card, .stat-item'
);

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

animTargets.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity 0.5s ease ${(i % 4) * 0.08}s, transform 0.5s ease ${(i % 4) * 0.08}s`;
  fadeObserver.observe(el);
});

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // cerrar todos
    document.querySelectorAll('.faq-item.open').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
    });
    // abrir el clickeado si estaba cerrado
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ===== SMOOTH SCROLL para links internos =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const headerH = header.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== BOTÓN FLOTANTE: ocultar cuando el CTA es visible =====
const ctaSection = document.querySelector('.cta-section');
const waFloat = document.querySelector('.whatsapp-float');

if (ctaSection && waFloat) {
  const ctaObserver = new IntersectionObserver((entries) => {
    waFloat.style.opacity = entries[0].isIntersecting ? '0' : '1';
    waFloat.style.pointerEvents = entries[0].isIntersecting ? 'none' : 'auto';
  }, { threshold: 0.5 });
  ctaObserver.observe(ctaSection);
}
