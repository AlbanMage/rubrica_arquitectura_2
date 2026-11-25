/* Login y registro */
(async () => {
  const { api, $, params, getUser } = UC;
  const next = (() => {
    const n = params().get('next') || '';
    return n.startsWith('/') && !n.startsWith('//') ? n : '';
  })();

  const existing = await getUser();
  if (existing) {
    location.href = next || (existing.role === 'admin' ? '/admin.html' : '/cuenta.html');
    return;
  }

  const loginForm = $('#login-form');
  const registerForm = $('#register-form');
  const tabLogin = $('#tab-login');
  const tabRegister = $('#tab-register');

  function showTab(which) {
    const isLogin = which === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
  }
  tabLogin.addEventListener('click', () => showTab('login'));
  tabRegister.addEventListener('click', () => showTab('register'));
  if (params().get('modo') === 'registro') showTab('register');

  const showMsg = (el, text, type = 'error') => {
    el.className = 'form-msg ' + type;
    el.textContent = text;
  };

  const redirect = (user) => {
    location.href = next || (user.role === 'admin' ? '/admin.html' : '/cuenta.html');
  };

  // Medidor de fortaleza de contraseña
  $('#r-pass').addEventListener('input', (e) => {
    const v = e.target.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Za-z]/.test(v) && /\d/.test(v)) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) score++;
    const levels = [
      ['0%', '#e9e7e3', 'Mínimo 8 caracteres, con letras y números.'],
      ['25%', '#c0392b', 'Débil'],
      ['50%', '#d68910', 'Aceptable'],
      ['75%', '#b08d57', 'Buena'],
      ['100%', '#2e7d4f', 'Muy segura'],
    ];
    const [w, c, t] = levels[v ? score : 0];
    $('#meter').style.width = w;
    $('#meter').style.background = c;
    $('#meter-text').textContent = t;
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#login-msg');
    const btn = loginForm.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const { user } = await api('/auth/login', {
        method: 'POST',
        body: { email: loginForm.email.value, password: loginForm.password.value },
      });
      showMsg(msg, `¡Hola ${user.name.split(' ')[0]}! Redirigiendo…`, 'ok');
      setTimeout(() => redirect(user), 500);
    } catch (err) {
      showMsg(msg, err.message);
      btn.disabled = false;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#register-msg');
    const f = registerForm;
    if (f.password.value !== f.password2.value) return showMsg(msg, 'Las contraseñas no coinciden');
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const { user } = await api('/auth/register', {
        method: 'POST',
        body: { name: f.name.value, email: f.email.value, password: f.password.value },
      });
      showMsg(msg, '¡Cuenta creada con éxito! Redirigiendo…', 'ok');
      setTimeout(() => redirect(user), 600);
    } catch (err) {
      showMsg(msg, err.message);
      btn.disabled = false;
    }
  });
})();
