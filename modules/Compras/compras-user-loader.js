/**
 * Módulo Compras - Carregador de Usuário
 * Script para carregar e exibir dados do usuário logado em todas as páginas do módulo
 */

(function() {
    'use strict';
    
    // Executar quando DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function() {
        initUserHeader();
    });

    /**
     * Inicializa o header com dados do usuário
     */
    async function initUserHeader() {
        console.log('🔄 [Compras] Inicializando header do usuário...');
        
        // Tentar carregar dados do localStorage primeiro
        let userData = getUserDataFromStorage();
        
        if (!userData) {
            // Se não tiver no localStorage, buscar da API
            userData = await fetchUserData();
        }
        
        if (userData) {
            updateUserHeader(userData);
        } else {
            // Dados padrão se não conseguir carregar
            updateUserHeader({
                nome: 'Usuário',
                email: '',
                avatar: '/avatars/default.webp',
                cargo: 'Colaborador'
            });
        }
    }

    /**
     * Busca dados do usuário da API
     */
    async function fetchUserData() {
        try {
            const response = await fetch('/api/me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                // Salvar no localStorage para uso futuro
                localStorage.setItem('userData', JSON.stringify(userData));
                return userData;
            }
        } catch (error) {
            console.warn('⚠️ [Compras] Erro ao buscar dados do usuário:', error);
        }
        return null;
    }

    /**
     * Obtém dados do usuário do localStorage
     */
    function getUserDataFromStorage() {
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Atualiza o header com dados do usuário
     */
    function updateUserHeader(userData) {
        // Usar apelido se disponível, senão primeiro nome
        const userName = userData.apelido || userData.nome || 'Usuário';
        const primeiroNome = userData.apelido || (userData.nome ? userData.nome.split(' ')[0] : 'Usuário');
        const fotoUrl = userData.foto || userData.avatar || '/avatars/default.webp';
        const inicial = primeiroNome ? primeiroNome[0].toUpperCase() : 'U';
        
        // Atualizar saudação dinâmica baseada na hora
        const greetingTextEl = document.getElementById('greeting-text');
        if (greetingTextEl) {
            const hour = new Date().getHours();
            let greeting = 'Bom dia';
            if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
            else if (hour >= 18 || hour < 5) greeting = 'Boa noite';
            greetingTextEl.textContent = greeting;
        }
        
        // Atualizar nome do usuário - múltiplos seletores
        const userTextElements = document.querySelectorAll('.user-text');
        userTextElements.forEach(el => {
            el.textContent = primeiroNome;
        });
        
        // Atualizar #user-name (usado em várias páginas)
        const userNameById = document.getElementById('user-name');
        if (userNameById) {
            userNameById.textContent = primeiroNome;
        }
        
        // Atualizar avatar do usuário (para elementos com imagem)
        const avatarImages = document.querySelectorAll('.avatar-circle img');
        avatarImages.forEach(img => {
            img.src = fotoUrl;
            img.alt = userData.nome || 'Usuário';
            img.onerror = function() {
                this.onerror = null;
                this.src = '/avatars/default.webp';
            };
        });
        
        // Atualizar #user-photo (usado em várias páginas)
        const userPhotoById = document.getElementById('user-photo');
        if (userPhotoById) {
            userPhotoById.src = fotoUrl;
            userPhotoById.alt = userData.nome || 'Usuário';
            userPhotoById.style.display = 'block';
            userPhotoById.classList.add('visible');
            userPhotoById.onerror = function() {
                this.onerror = null;
                this.src = '/avatars/default.webp';
            };
        }
        
        // Atualizar elementos .user-avatar que usam iniciais
        const userAvatars = document.querySelectorAll('.user-avatar');
        userAvatars.forEach(avatar => {
            // Se tiver foto, substituir por imagem
            if (fotoUrl && fotoUrl !== '/avatars/default.webp') {
                // Verificar se já tem uma tag img dentro
                const existingImg = avatar.querySelector('img');
                if (existingImg) {
                    existingImg.src = fotoUrl;
                    existingImg.alt = userData.nome || 'Usuário';
                    existingImg.style.display = 'block';
                    existingImg.classList.add('visible');
                } else {
                    avatar.innerHTML = `<img src="${fotoUrl}" alt="${userData.nome || 'Usuário'}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">`;
                }
            }
        });
        
        // Atualizar iniciais - múltiplos seletores
        const userInitials = document.getElementById('userInitials');
        if (userInitials && userData.nome) {
            const iniciais = userData.nome.split(' ')
                .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                .map(n => n[0])
                .join('')
                .toUpperCase();
            userInitials.textContent = iniciais;
        }
        
        // Atualizar #user-initial ou #user-initials (usado em várias páginas)
        const userInitialById = document.getElementById('user-initial') || document.getElementById('user-initials');
        if (userInitialById) {
            userInitialById.textContent = inicial;
        }
        
        // Atualizar nome/role no dropdown (se existir)
        const userNameDropdown = document.querySelector('.user-name');
        const userRoleDropdown = document.querySelector('.user-role');
        
        if (userNameDropdown) {
            userNameDropdown.textContent = userData.nome || 'Usuário';
        }
        
        if (userRoleDropdown) {
            userRoleDropdown.textContent = userData.cargo || userData.role || 'Colaborador';
        }
        
        console.log('✅ [Compras] Header atualizado com dados do usuário:', userData.nome);
    }

    /**
     * Toggle do menu do usuário
     */
    window.toggleUserMenu = function() {
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    };

    // Fechar menu ao clicar fora
    document.addEventListener('click', function(e) {
        const userMenu = document.querySelector('.user-menu');
        const dropdown = document.getElementById('user-menu-dropdown');
        
        if (dropdown && dropdown.classList.contains('active')) {
            if (!userMenu || !userMenu.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        }
    });

    // Expor funções globalmente
    window.ComprasUserLoader = {
        init: initUserHeader,
        refresh: fetchUserData,
        update: updateUserHeader
    };
})();
