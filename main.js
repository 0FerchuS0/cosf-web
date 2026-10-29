const header = document.getElementById('header');
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

function closeMenu() {
  nav.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
}

navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('click', (e) => { if (!header.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

const revealItems = [...document.querySelectorAll('.reveal')];
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const group = [...entry.target.parentElement.children].filter((c) => c.classList.contains('reveal'));
      entry.target.style.transitionDelay = (group.indexOf(entry.target) % 2) * 0.14 + 's';
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  revealItems.forEach((el) => revealObserver.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('in'));
}

document.querySelectorAll('.faq-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((i) => {
      i.classList.remove('open');
      i.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
