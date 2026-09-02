(() => {
  const menuButton = document.querySelector('.menu-btn');
  const nav = document.querySelector('#site-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('#year').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const form = document.querySelector('#contact-form');
  const note = document.querySelector('#form-note');
  if (form && note) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      note.textContent = 'Your website form is ready for a Cloudflare email/CRM endpoint. No information was transmitted from this preview.';
      note.setAttribute('role', 'status');
    });
  }
})();
