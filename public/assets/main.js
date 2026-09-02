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
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const payload = {
        firstName: String(data.get('firstName') || '').trim(),
        lastName: String(data.get('lastName') || '').trim(),
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        service: String(data.get('service') || 'New Order').trim(),
        message: String(data.get('message') || '').trim(),
        smsConsent: Boolean(data.get('smsConsent'))
      };

      const submitBtn = form.querySelector('.submit-btn');
      if (submitBtn) submitBtn.disabled = true;
      note.setAttribute('role', 'status');
      note.style.color = '';
      note.textContent = 'Sending your request…';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json().catch(() => ({}));

        if (res.ok && result.ok) {
          note.textContent = "Thanks! Your message has been sent — we'll be in touch soon.";
          note.style.color = '#8af5ca';
          form.reset();
        } else {
          note.textContent = result.error || 'Something went wrong sending your message. Please call or email us directly.';
          note.style.color = '#ff8a8a';
        }
      } catch (err) {
        note.textContent = 'Something went wrong sending your message. Please call or email us directly.';
        note.style.color = '#ff8a8a';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
