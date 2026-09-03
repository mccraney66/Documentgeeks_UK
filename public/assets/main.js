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
  const submitButton = form?.querySelector('button[type="submit"]');

  if (form && note && submitButton) {
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
        service: String(data.get('service') || '').trim(),
        message: String(data.get('message') || '').trim(),
        smsConsent: Boolean(data.get('smsConsent')),
        website: String(data.get('website') || '').trim(),
      };

      submitButton.disabled = true;
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Sending…';
      note.textContent = 'Sending your request…';
      note.setAttribute('role', 'status');

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.error || `Request failed (${response.status}).`);
        }

        note.textContent = result.message || 'Thank you. Your request has been sent.';
        form.reset();
      } catch (error) {
        note.textContent = error?.message || 'Your request could not be sent. Please call 951-923-2527.';
        note.setAttribute('role', 'alert');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  }
})();
