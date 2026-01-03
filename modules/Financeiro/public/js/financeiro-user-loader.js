/**
 * Financeiro User Loader v2.0
 * Carrega informações do usuário logado nas páginas do módulo Financeiro
 */

(function() {
    'use strict';

    // Função para gerar avatar usando iniciais
    function generateAvatarUrl(name, email) {
        const displayName = name || email || 'Usuario';
        const initials = displayName.split(' ').map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=65a30d&color=fff&size=128&bold=true`;
    }

    // Buscar dados do usuário do localStorage
    function getUserDataFromStorage() {
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    // Carregar informações do usuário
    async function loadUserInfo() {
        console.log('🔄 [Financeiro] Carregando dados do usuário...');
        
        // Tentar carregar do localStorage primeiro (mais rápido)
        let user = getUserDataFromStorage();
        
        if (!user) {
            try {
                const response = await fetch('/api/me', { 
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (response.ok) {
                    user = await response.json();
                    // Salvar no localStorage para uso futuro
                    localStorage.setItem('userData', JSON.stringify(user));
                }
            } catch (error) {
                console.error('❌ [Financeiro] Erro ao carregar usuário:', error);
            }
        }

        if (user) {
            updateUserDisplay(user);
        } else {
            // Dados padrão se não conseguir carregar
            updateUserDisplay({
                nome: 'Usuário',
                email: '',
                avatar: null,
                foto: null
            });
        }
    }

    // Atualizar exibição do usuário no header
    function updateUserDisplay(user) {
        const userName = user.nome || user.apelido || 'Usuário';
        const primeiroNome = userName.split(' ')[0];
        
        // Determinar foto/avatar do usuário
        let userAvatar = user.foto || user.avatar;
        
        // Verificar se o avatar é válido (não é default)
        if (!userAvatar || userAvatar === '/avatars/default.webp' || userAvatar === '' || userAvatar === 'null') {
            userAvatar = generateAvatarUrl(userName, user.email);
        }
        
        // Atualizar nome do usuário
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = primeiroNome;
        }
        
        // Atualizar foto do usuário
        const userPhotoEl = document.getElementById('user-photo');
        const userInitialEl = document.getElementById('user-initial');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userAvatar && userPhotoEl) {
            userPhotoEl.src = userAvatar;
            userPhotoEl.alt = userName;
            userPhotoEl.classList.add('visible');
            userPhotoEl.style.display = 'block';
            
            // Ocultar inicial se foto carregou
            if (userInitialEl) {
                userInitialEl.style.display = 'none';
            }
            
            // Fallback se a imagem falhar
            userPhotoEl.onerror = function() {
                this.style.display = 'none';
                if (userInitialEl) {
                    userInitialEl.textContent = primeiroNome.charAt(0).toUpperCase();
                    userInitialEl.style.display = 'flex';
                }
            };
        } else if (userInitialEl) {
            // Mostrar apenas inicial se não tiver foto
            userInitialEl.textContent = primeiroNome.charAt(0).toUpperCase();
            userInitialEl.style.display = 'flex';
            if (userPhotoEl) userPhotoEl.style.display = 'none';
        }
        
        console.log('✅ [Financeiro] Usuário carregado:', primeiroNome, '| Foto:', !!userAvatar);
    }

    // Executar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserInfo);
    } else {
        loadUserInfo();
    }
})();
