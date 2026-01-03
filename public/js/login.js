document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessageDiv = document.getElementById('error-message');
  const submitBtn = document.getElementById('login-submit-btn');
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('password');
  const emailInput = document.getElementById('email');
  const userAvatar = document.getElementById('user-avatar');

  if (!loginForm) return;

  // Helper para chamadas à API: usa config.js para determinar URL base
  // GitHub Pages → Railway API, Local → mesmo servidor
  function apiFetch(path, options = {}) {
    const baseUrl = window.ALUFORCE_CONFIG?.API_BASE_URL || '';
    const url = baseUrl + path;
    return fetch(url, {
      ...options,
      credentials: 'include'
    });
  }

  // Mapeamento de avatares para usuários com nomes específicos
  const avatarNameMap = {
    'clemerson': 'Clemerson.webp',
    'isabela': 'Isabela.webp',
    'thaina': 'Thaina.webp',
    'thiago': 'Thiago.webp',
    'nicolas': 'NicolasDaniel.webp',
    'nicolasdaniel': 'NicolasDaniel.webp',
    'rh': 'Rh.webp',
    'admin': 'admin.webp',
    'joao': 'joao.svg',
    'maria': 'maria.svg',
    'ti': 'TI.webp',
    'tialuforce': 'TI.webp',
    'antonio': 'Antonio.webp',
    'andreia': 'Andreia.webp',
    'guilherme': 'Guilherme.webp'
  };

  // Função para obter o avatar de um usuário baseado no email
  function getUserAvatar(username) {
    const formats = ['webp', 'svg', 'jpg', 'png'];
    
    // Verifica mapeamento especial primeiro
    if (avatarNameMap[username.toLowerCase()]) {
      return `avatars/${avatarNameMap[username.toLowerCase()]}`;
    }
    
    // Tenta encontrar avatar com diferentes formatos (webp prioritário)
    for (const format of formats) {
      const potentialPath = `avatars/${username}.${format}`;
      return potentialPath; // Retorna o primeiro formato (será validado no carregamento)
    }
    
    return null;
  }

  // Funcionalidade de avatar dinâmico baseado no email
  if (emailInput && userAvatar) {
    let avatarTimeout;
    
    emailInput.addEventListener('input', () => {
      clearTimeout(avatarTimeout);
      const email = emailInput.value.trim().toLowerCase();
      
      // Remove o avatar se o campo estiver vazio
      if (email.length === 0) {
        hideUserAvatar();
        return;
      }
      
      // Mostra o avatar mais cedo para melhor UX
      avatarTimeout = setTimeout(() => {
        if (email.length >= 3) {
          showUserAvatar(email);
        }
      }, 300);
    });

    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim().toLowerCase();
      if (email.includes('@')) {
        showUserAvatar(email);
      }
    });
  }

  function showUserAvatar(email) {
    const emailParts = email.toLowerCase().split('@');
    const username = emailParts[0];
    
    // Verifica se é um email da Aluforce
    if (emailParts[1] && emailParts[1].includes('aluforce')) {
      // Extrai apenas o primeiro nome do email (antes do ponto)
      const firstName = username.split('.')[0];
      
      // Tenta obter avatar do usuário usando o primeiro nome
      const avatarPath = getUserAvatar(firstName);
      
      if (avatarPath) {
        // Cria elemento de imagem com fallback
        const img = document.createElement('img');
        img.src = avatarPath;
        img.alt = firstName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        
        // Fallback para quando a imagem não carrega
        img.onerror = function() {
          const initials = firstName.substring(0, 2).toUpperCase();
          userAvatar.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
        };
        
        userAvatar.innerHTML = '';
        userAvatar.appendChild(img);
      } else {
        // Usuário da Aluforce mas sem avatar - mostra iniciais
        const initials = firstName.substring(0, 2).toUpperCase();
        userAvatar.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
      }
    } else {
      // Email externo - mostra ícone genérico
      userAvatar.innerHTML = `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`;
    }
    
    userAvatar.classList.add('show');
    
    // Adiciona classe ao formulário para ajustar espaçamentos
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
      loginForm.classList.add('has-avatar');
    }
  }

  // Função para esconder avatar
  function hideUserAvatar() {
    if (userAvatar) {
      userAvatar.classList.remove('show');
      const loginForm = document.querySelector('.login-form');
      if (loginForm) {
        loginForm.classList.remove('has-avatar');
      }
    }
  }

  // Funcionalidade de mostrar/ocultar senha
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Atualiza o ícone
      if (type === 'text') {
        passwordToggle.classList.remove('fa-eye');
        passwordToggle.classList.add('fa-eye-slash');
        passwordToggle.setAttribute('title', 'Ocultar senha');
      } else {
        passwordToggle.classList.remove('fa-eye-slash');
        passwordToggle.classList.add('fa-eye');
        passwordToggle.setAttribute('title', 'Mostrar senha');
      }
    });
  }

  // ================================
  // MODAL DE RECUPERAÇÁO DE SENHA
  // ================================
  
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const forgotPasswordLink = document.getElementById('forgot-password');
  const modalClose = document.getElementById('modal-close');
  
  let currentStep = 1;
  let userVerificationData = {};

  // Funcionalidade "Esqueceu a senha?"
  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      openForgotPasswordModal();
    });
  }

  // Abrir modal
  function openForgotPasswordModal() {
    const email = emailInput ? emailInput.value.trim() : '';
    
    // Pre-preenche email se já digitado
    const verifyEmailInput = document.getElementById('verify-email');
    if (verifyEmailInput && email) {
      verifyEmailInput.value = email;
    }
    
    forgotPasswordModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    resetModal();
  }

  // Fechar modal
  function closeForgotPasswordModal() {
    forgotPasswordModal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => resetModal(), 300);
  }

  // Reset modal para step 1
  function resetModal() {
    currentStep = 1;
    showStep(1);
    clearModalInputs();
  }

  // Limpar inputs do modal
  function clearModalInputs() {
    const inputs = forgotPasswordModal.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.id !== 'verify-email') { // Mantém email se já preenchido
        input.value = '';
      }
    });
  }

  // Eventos de fechar modal
  if (modalClose) {
    modalClose.addEventListener('click', closeForgotPasswordModal);
  }

  // Fechar modal clicando fora
  forgotPasswordModal?.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
      closeForgotPasswordModal();
    }
  });

  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && forgotPasswordModal?.classList.contains('show')) {
      closeForgotPasswordModal();
    }
  });

  // Mostrar step específico
  function showStep(step) {
    // Esconder todos os steps
    for (let i = 1; i <= 3; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      const dotEl = document.getElementById(`step-dot-${i}`);
      
      if (stepEl) stepEl.classList.remove('active');
      if (dotEl) dotEl.classList.remove('active');
    }
    
    // Mostrar step atual
    const activeStep = document.getElementById(`step-${step}`);
    const activeDot = document.getElementById(`step-dot-${step}`);
    
    if (activeStep) activeStep.classList.add('active');
    if (activeDot) activeDot.classList.add('active');
    
    currentStep = step;
  }

  // ================================
  // STEP 1: Verificar Email
  // ================================
  
  const nextStep1 = document.getElementById('next-step-1');
  const cancelStep1 = document.getElementById('cancel-step-1');
  
  nextStep1?.addEventListener('click', async () => {
    const email = document.getElementById('verify-email')?.value.trim();
    
    if (!email || !email.includes('@')) {
      showModalMessage('Por favor, digite um email válido.', 'error');
      return;
    }
    
    nextStep1.disabled = true;
    nextStep1.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    try {
      // Enviar email de recuperação de senha
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          data = { message: 'Resposta inválida do servidor.' };
        }
      } else {
        const text = await response.text();
        data = { message: text || `Erro (${response.status})` };
      }

      if (response.ok || data.success) {
        showModalMessage('✅ Link de recuperação enviado! Verifique seu email para continuar.', 'success');
        
        // Fechar modal após 3 segundos
        setTimeout(() => {
          closeForgotPasswordModal();
        }, 3000);
      } else {
        showModalMessage(data.message || 'Erro ao enviar email de recuperação.', 'error');
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      showModalMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
      nextStep1.disabled = false;
      nextStep1.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Link';
    }
  });
  
  cancelStep1?.addEventListener('click', closeForgotPasswordModal);

  // ================================
  // STEP 2: Verificar Dados
  // ================================
  
  const nextStep2 = document.getElementById('next-step-2');
  const backStep2 = document.getElementById('back-step-2');
  
  nextStep2?.addEventListener('click', async () => {
    const name = document.getElementById('verify-name')?.value.trim();
    const department = document.getElementById('verify-department')?.value;
    
    if (!name || !department) {
      showModalMessage('Por favor, preencha todos os campos.', 'error');
      return;
    }
    
    nextStep2.disabled = true;
    nextStep2.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    
    try {
      // Verificar dados do usuário
      const response = await apiFetch('/api/auth/verify-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userVerificationData.userId,
          name,
          department 
        })
      });

      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          data = { message: 'Resposta inválida do servidor.' };
        }
      } else {
        const text = await response.text();
        data = { message: text || `Erro (${response.status})` };
      }

      if (response.ok) {
        userVerificationData.name = name;
        userVerificationData.department = department;
        showStep(3);
      } else {
        showModalMessage(data.message || 'Dados não conferem com nossos registros.', 'error');
      }
    } catch (error) {
      console.error('Erro ao verificar dados:', error);
      showModalMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
      nextStep2.disabled = false;
      nextStep2.innerHTML = '<i class="fas fa-arrow-right"></i> Verificar';
    }
  });
  
  backStep2?.addEventListener('click', () => showStep(1));

  // ================================
  // STEP 3: Nova Senha
  // ================================
  
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const changePasswordBtn = document.getElementById('change-password');
  const backStep3 = document.getElementById('back-step-3');
  
  // Verificador de força da senha
  newPasswordInput?.addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
  });
  
  function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.password-strength');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    let message = '';
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    strengthBar.className = 'password-strength';
    
    if (strength <= 2) {
      strengthBar.classList.add('strength-weak');
      message = 'Senha fraca';
    } else if (strength === 3) {
      strengthBar.classList.add('strength-fair');
      message = 'Senha razoável';
    } else if (strength === 4) {
      strengthBar.classList.add('strength-good');
      message = 'Senha boa';
    } else {
      strengthBar.classList.add('strength-strong');
      message = 'Senha forte';
    }
    
    strengthText.textContent = message;
    strengthText.style.color = getStrengthColor(strength);
  }
  
  function getStrengthColor(strength) {
    if (strength <= 2) return '#ef4444';
    if (strength === 3) return '#f59e0b';
    if (strength === 4) return '#3b82f6';
    return '#22c55e';
  }
  
  changePasswordBtn?.addEventListener('click', async () => {
    const newPassword = newPasswordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;
    
    if (!newPassword || !confirmPassword) {
      showModalMessage('Por favor, preencha ambos os campos de senha.', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showModalMessage('As senhas não coincidem.', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showModalMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    
    changePasswordBtn.disabled = true;
    changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';
    
    try {
      // Alterar senha no banco
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userVerificationData.userId,
          email: userVerificationData.email,
          newPassword: newPassword
        })
      });

      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          data = { message: 'Resposta inválida do servidor.' };
        }
      } else {
        const text = await response.text();
        data = { message: text || `Erro (${response.status})` };
      }

      if (response.ok) {
        showModalMessage('Senha alterada com sucesso!', 'success');
        setTimeout(() => {
          closeForgotPasswordModal();
          // Pre-preenche o email no login
          if (emailInput) {
            emailInput.value = userVerificationData.email;
          }
          showMessage('Senha alterada! Faça login com sua nova senha.', 'success');
        }, 2000);
      } else {
        showModalMessage(data.message || 'Erro ao alterar senha.', 'error');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showModalMessage('Erro de conexão. Tente novamente.', 'error');
    } finally {
      changePasswordBtn.disabled = false;
      changePasswordBtn.innerHTML = '<i class="fas fa-check"></i> Alterar Senha';
    }
  });
  
  backStep3?.addEventListener('click', () => showStep(2));
  
  // Função para mostrar mensagens no modal
  function showModalMessage(message, type = 'error') {
    // Remove mensagem anterior
    const existingMessage = forgotPasswordModal.querySelector('.modal-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Cria nova mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `modal-message ${type === 'success' ? 'success-message' : 'error-message'} visible`;
    messageDiv.textContent = message;
    
    // Adiciona após o cabeçalho
    const header = forgotPasswordModal.querySelector('.modal-header');
    if (header) {
      header.insertAdjacentElement('afterend', messageDiv);
    }
    
    // Remove após 5 segundos
    setTimeout(() => {
      messageDiv?.remove();
    }, 5000);
  }

  // Função auxiliar para mostrar mensagens
  function showMessage(message, type = 'error') {
    const messageDiv = errorMessageDiv;
    if (!messageDiv) return;
    
    messageDiv.className = type === 'success' ? 'success-message visible' : 'error-message visible';
    messageDiv.textContent = message;
    
    // Remove a mensagem após 5 segundos
    setTimeout(() => {
      messageDiv.classList.remove('visible');
    }, 5000);
  }

  // ===================== FUNCIONALIDADE "LEMBRAR-ME" SEGURA =====================
  
  const rememberCheckbox = document.getElementById('remember-me');
  
  // Ao carregar a página, verifica se existe token de lembrar-me
  async function checkRememberToken() {
    try {
      const response = await apiFetch('/api/auth/validate-remember-token', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[LOGIN/REMEMBER] ✅ Token válido, fazendo login automático...');
        
        // Redireciona automaticamente para o dashboard
        window.location.href = '/index.html';
      } else {
        console.log('[LOGIN/REMEMBER] Token inválido ou expirado');
      }
    } catch (error) {
      console.log('[LOGIN/REMEMBER] Sem token de lembrar-me ou erro:', error.message);
    }
  }
  
  // Verifica token ao carregar página
  checkRememberToken();
  
  // Gerencia checkbox "Lembrar-me"
  if (rememberCheckbox) {
    // Ao mudar o checkbox
    rememberCheckbox.addEventListener('change', async () => {
      if (!rememberCheckbox.checked) {
        // Desmarcou - remove token do servidor
        try {
          await apiFetch('/api/auth/remove-remember-token', {
            method: 'POST',
            credentials: 'include'
          });
          console.log('[LOGIN/REMEMBER] Token removido');
        } catch (error) {
          console.error('[LOGIN/REMEMBER] Erro ao remover token:', error);
        }
      }
    });
  }

  // Toggle loading state on the submit button (shows spinner, hides text)
  function setLoading(loading) {
  if (!submitBtn) return;
  submitBtn.disabled = loading;
  submitBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
  // Toggle the loading class; CSS controls spinner visibility and layout
  submitBtn.classList.toggle('loading', loading);
  // Ensure the visible text is still present for screen readers
  const textEl = submitBtn.querySelector('.btn-text');
  if (textEl) textEl.setAttribute('aria-hidden', loading ? 'true' : 'false');
  // Avoid inline style manipulation so CSS can manage layout and animation
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn && submitBtn.disabled) return; // prevent double submit

    if (errorMessageDiv) {
      errorMessageDiv.classList.remove('visible');
      errorMessageDiv.textContent = '';
      errorMessageDiv.setAttribute('aria-live', 'polite');
    }

    setLoading(true);

    const usernameEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!username || !password) {
      if (errorMessageDiv) {
        errorMessageDiv.textContent = 'Preencha email e senha.';
        errorMessageDiv.classList.add('visible');
      }
      // focus the first missing field for faster correction
      if (!username && usernameEl) usernameEl.focus();
      else if (!password && passwordEl) passwordEl.focus();
      setLoading(false);
      return;
    }

    try {
      // Use the main system login endpoint which sets an HttpOnly session cookie
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: username, password })
      });

      // Try to parse JSON safely
      let data = {};
      try { data = await response.json(); } catch (e) { data = {}; }

      if (!response.ok) {
        // server provided message preferred
        const msg = (data && data.message) ? data.message : `Erro de autenticação (${response.status})`;
        throw new Error(msg);
      }

      // Salvar token no localStorage para compatibilidade com módulos que usam Bearer token
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('authToken', data.token);
        console.log('[LOGIN] ✅ Token salvo no localStorage');
      }

      // Login bem-sucedido: se o servidor já sugeriu um redirect, siga-o imediatamente.
      if (data && data.redirectTo) {
        const redirectTo = data.redirectTo;
        console.log('[LOGIN] ✅ Login bem-sucedido! Servidor sugeriu redirect:', redirectTo);

        // Se "Lembrar-me" estiver marcado, cria token persistente
        if (rememberCheckbox && rememberCheckbox.checked && data.user) {
          console.log('[LOGIN] Criando token de lembrar-me...');
          try {
            const rememberResp = await apiFetch('/api/auth/create-remember-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ 
                userId: data.user.id, 
                email: data.user.email 
              })
            });
            
            if (rememberResp.ok) {
              console.log('[LOGIN] ✅ Token de lembrar-me criado');
            } else {
              console.warn('[LOGIN] ⚠️ Falha ao criar token de lembrar-me');
            }
          } catch (e) {
            console.warn('[LOGIN] ⚠️ Erro ao criar token de lembrar-me:', e.message);
          }
        }

        // Aguarda um momento para o cookie ser salvo pelo navegador
        console.log('[LOGIN] Aguardando 500ms para cookie ser salvo...');
        await new Promise(r => setTimeout(r, 500));

        // Verifica se a sessão está OK antes de redirecionar
        console.log('[LOGIN] Verificando sessão com /api/me...');
        try {
          const meResp = await apiFetch('/api/me', { credentials: 'include' });
          console.log('[LOGIN] /api/me status:', meResp.status);
          
          if (meResp.ok) {
            const userData = await meResp.json();
            console.log('[LOGIN] ✅ Sessão confirmada! Usuário:', userData.nome);
            console.log('[LOGIN] Redirecionando para:', redirectTo);
            window.location.href = redirectTo;
            return;
          } else {
            console.error('[LOGIN] ❌ /api/me retornou erro:', meResp.status);
            const errorData = await meResp.json();
            console.error('[LOGIN] Erro:', errorData);
            throw new Error('Sessão não confirmada. Cookie pode não ter sido salvo.');
          }
        } catch (e) {
          console.error('[LOGIN] ❌ Erro ao verificar sessão:', e.message);
          throw new Error('Falha ao verificar sessão: ' + e.message);
        }
      }

      // Caso não haja redirect sugerido, confirme a sessão via /api/me antes de redirecionar para o dashboard.
      
      // Se "Lembrar-me" estiver marcado, cria token persistente
      if (rememberCheckbox && rememberCheckbox.checked && data.user) {
        console.log('[LOGIN] Criando token de lembrar-me...');
        try {
          const rememberResp = await apiFetch('/api/auth/create-remember-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              userId: data.user.id, 
              email: data.user.email 
            })
          });
          
          if (rememberResp.ok) {
            console.log('[LOGIN] ✅ Token de lembrar-me criado');
          } else {
            console.warn('[LOGIN] ⚠️ Falha ao criar token de lembrar-me');
          }
        } catch (e) {
          console.warn('[LOGIN] ⚠️ Erro ao criar token de lembrar-me:', e.message);
        }
      }
      
      try {
        const meResp = await apiFetch('/api/me', { credentials: 'include' });
        if (meResp.ok) {
          window.location.href = '/dashboard';
        } else {
          throw new Error('Falha ao autenticar sessão. Tente novamente.');
        }
      } catch (e) {
        throw new Error('Falha ao autenticar sessão. Tente novamente.');
      }
    } catch (error) {
      if (errorMessageDiv) {
        const msg = error && error.message ? error.message : 'Erro ao efetuar login';
        errorMessageDiv.textContent = msg;
        errorMessageDiv.classList.add('visible');
        // focus the email field so user can retry quickly
        const tryFocus = document.getElementById('email') || document.getElementById('username');
        if (tryFocus) tryFocus.focus();
      }
      console.debug('[login] error', error);
    } finally {
      setLoading(false);
    }
  });
});
