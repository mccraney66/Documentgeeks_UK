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

      const data = new FormData(form);
      const firstName = String(data.get('firstName') || '').trim();
      const lastName = String(data.get('lastName') || '').trim();
      const email = String(data.get('email') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const service = String(data.get('service') || 'New Order').trim();
      const message = String(data.get('message') || '').trim();
      const smsConsent = data.get('smsConsent') ? 'Yes' : 'No';

      const subject = `Document Geeks Request - ${service}`;
      const body = [
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Phone: ${phone || 'Not provided'}`,
        `Service: ${service}`,
        `SMS opt-in: ${smsConsent}`,
        '',
        'Message:',
        message
      ].join('\n');

      note.textContent = 'Your email app should open with your request filled in. Review the message and click Send.';
      note.setAttribute('role', 'status');

      window.location.href = `mailto:info@documentgeeks.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
