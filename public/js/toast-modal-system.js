/**
 * ALUFORCE - Sistema de Toasts e Modais Profissionais
 * Substitui alerts nativos por componentes modernos
 * @version 2.0
 */

(function() {
    'use strict';

    // =============================================
    // SISTEMA DE TOASTS
    // =============================================
    
    // Container de toasts
    let toastContainer = null;
    
    function createToastContainer() {
        if (toastContainer) return toastContainer;
        
        toastContainer = document.createElement('div');
        toastContainer.id = 'aluforce-toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
        return toastContainer;
    }

    /**
     * Exibe um toast de notificação
     * @param {string} message - Mensagem do toast
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duração em ms (padrão 4000)
     */
    window.showToast = function(message, type = 'info', duration = 4000) {
        const container = createToastContainer();
        
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        const colors = {
            success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
            error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
            warning: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
            info: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }
        };

        const color = colors[type] || colors.info;
        const icon = icons[type] || icons.info;

        const toast = document.createElement('div');
        toast.className = 'aluforce-toast';
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            background: ${color.bg};
            border-left: 4px solid ${color.border};
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            color: ${color.text};
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(120%);
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            cursor: pointer;
        `;

        toast.innerHTML = `
            <div style="flex-shrink: 0;">${icon}</div>
            <div style="flex: 1; line-height: 1.4;">${message}</div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; opacity: 0.7; font-size: 18px;">×</button>
        `;

        container.appendChild(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Auto-remover
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);

        // Click para fechar
        toast.addEventListener('click', () => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        });
    };

    // =============================================
    // SISTEMA DE MODAIS
    // =============================================

    let modalContainer = null;

    function createModalContainer() {
        if (modalContainer) return modalContainer;
        
        modalContainer = document.createElement('div');
        modalContainer.id = 'aluforce-modal-container';
        document.body.appendChild(modalContainer);
        return modalContainer;
    }

    /**
     * Exibe um modal de alerta (substitui alert())
     * @param {string} message - Mensagem
     * @param {string} title - Título opcional
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     */
    window.showAlert = function(message, title = '', type = 'info') {
        return new Promise((resolve) => {
            const container = createModalContainer();
            
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            const color = colors[type] || colors.info;
            const icon = icons[type] || icons.info;
            const defaultTitles = {
                success: 'Sucesso!',
                error: 'Erro!',
                warning: 'Atenção!',
                info: 'Informação'
            };

            const modal = document.createElement('div');
            modal.className = 'aluforce-modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            modal.innerHTML = `
                <div class="aluforce-modal-box" style="
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 400px;
                    width: 90%;
                    transform: scale(0.9);
                    transition: transform 0.2s ease;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 24px 24px 20px;
                        text-align: center;
                    ">
                        <div style="
                            width: 56px;
                            height: 56px;
                            background: ${color}15;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 16px;
                            font-size: 24px;
                            color: ${color};
                        ">${icon}</div>
                        <h3 style="
                            margin: 0 0 8px;
                            font-size: 18px;
                            font-weight: 600;
                            color: #1e293b;
                            font-family: 'Inter', sans-serif;
                        ">${title || defaultTitles[type]}</h3>
                        <p style="
                            margin: 0;
                            font-size: 14px;
                            color: #64748b;
                            line-height: 1.5;
                            font-family: 'Inter', sans-serif;
                        ">${message}</p>
                    </div>
                    <div style="
                        padding: 16px 24px;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: center;
                    ">
                        <button class="modal-btn-ok" style="
                            padding: 10px 32px;
                            background: ${color};
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Inter', sans-serif;
                        ">OK</button>
                    </div>
                </div>
            `;

            container.appendChild(modal);

            // Animar entrada
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(1)';
            });

            const closeModal = () => {
                modal.style.opacity = '0';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(0.9)';
                setTimeout(() => {
                    modal.remove();
                    resolve();
                }, 200);
            };

            modal.querySelector('.modal-btn-ok').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // ESC para fechar
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    };

    /**
     * Exibe um modal de confirmação (substitui confirm())
     * @param {string} message - Mensagem
     * @param {string} title - Título opcional
     * @param {object} options - Opções {confirmText, cancelText, type}
     */
    window.showConfirm = function(message, title = 'Confirmar', options = {}) {
        return new Promise((resolve) => {
            const container = createModalContainer();
            const { confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;
            
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6',
                danger: '#ef4444'
            };

            const color = colors[type] || colors.warning;

            const modal = document.createElement('div');
            modal.className = 'aluforce-modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            modal.innerHTML = `
                <div class="aluforce-modal-box" style="
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 420px;
                    width: 90%;
                    transform: scale(0.9);
                    transition: transform 0.2s ease;
                    overflow: hidden;
                ">
                    <div style="padding: 24px 24px 20px; text-align: center;">
                        <div style="
                            width: 56px;
                            height: 56px;
                            background: ${color}15;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 16px;
                        ">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                        <h3 style="
                            margin: 0 0 8px;
                            font-size: 18px;
                            font-weight: 600;
                            color: #1e293b;
                            font-family: 'Inter', sans-serif;
                        ">${title}</h3>
                        <p style="
                            margin: 0;
                            font-size: 14px;
                            color: #64748b;
                            line-height: 1.5;
                            font-family: 'Inter', sans-serif;
                        ">${message}</p>
                    </div>
                    <div style="
                        padding: 16px 24px;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: center;
                        gap: 12px;
                    ">
                        <button class="modal-btn-cancel" style="
                            padding: 10px 24px;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Inter', sans-serif;
                        ">${cancelText}</button>
                        <button class="modal-btn-confirm" style="
                            padding: 10px 24px;
                            background: ${color};
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Inter', sans-serif;
                        ">${confirmText}</button>
                    </div>
                </div>
            `;

            container.appendChild(modal);

            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(1)';
            });

            const closeModal = (result) => {
                modal.style.opacity = '0';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(0.9)';
                setTimeout(() => {
                    modal.remove();
                    resolve(result);
                }, 200);
            };

            modal.querySelector('.modal-btn-confirm').addEventListener('click', () => closeModal(true));
            modal.querySelector('.modal-btn-cancel').addEventListener('click', () => closeModal(false));
        });
    };

    /**
     * Exibe um modal de input (substitui prompt())
     * @param {string} message - Mensagem
     * @param {string} defaultValue - Valor padrão
     * @param {object} options - Opções {title, placeholder, type}
     */
    window.showPrompt = function(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const container = createModalContainer();
            const { title = 'Entrada', placeholder = '', type = 'text' } = options;

            const modal = document.createElement('div');
            modal.className = 'aluforce-modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            modal.innerHTML = `
                <div class="aluforce-modal-box" style="
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 420px;
                    width: 90%;
                    transform: scale(0.9);
                    transition: transform 0.2s ease;
                    overflow: hidden;
                ">
                    <div style="padding: 24px;">
                        <h3 style="
                            margin: 0 0 8px;
                            font-size: 18px;
                            font-weight: 600;
                            color: #1e293b;
                            font-family: 'Inter', sans-serif;
                        ">${title}</h3>
                        <p style="
                            margin: 0 0 16px;
                            font-size: 14px;
                            color: #64748b;
                            line-height: 1.5;
                            font-family: 'Inter', sans-serif;
                        ">${message}</p>
                        <input type="${type}" class="modal-input" value="${defaultValue}" placeholder="${placeholder}" style="
                            width: 100%;
                            padding: 12px 14px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 14px;
                            font-family: 'Inter', sans-serif;
                            outline: none;
                            transition: border-color 0.2s;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div style="
                        padding: 16px 24px;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    ">
                        <button class="modal-btn-cancel" style="
                            padding: 10px 24px;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            font-family: 'Inter', sans-serif;
                        ">Cancelar</button>
                        <button class="modal-btn-confirm" style="
                            padding: 10px 24px;
                            background: #10b981;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            font-family: 'Inter', sans-serif;
                        ">Confirmar</button>
                    </div>
                </div>
            `;

            container.appendChild(modal);

            const input = modal.querySelector('.modal-input');
            
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(1)';
                input.focus();
                input.select();
            });

            const closeModal = (value) => {
                modal.style.opacity = '0';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(0.9)';
                setTimeout(() => {
                    modal.remove();
                    resolve(value);
                }, 200);
            };

            modal.querySelector('.modal-btn-confirm').addEventListener('click', () => closeModal(input.value));
            modal.querySelector('.modal-btn-cancel').addEventListener('click', () => closeModal(null));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') closeModal(input.value);
            });

            input.addEventListener('focus', () => {
                input.style.borderColor = '#10b981';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = '#e2e8f0';
            });
        });
    };

    /**
     * Modal de seleção de status para logística
     */
    window.showStatusSelect = function(currentStatus, pedidoId) {
        return new Promise((resolve) => {
            const container = createModalContainer();

            const statusOptions = [
                { value: 'aguardando_separacao', label: 'Aguardando Separação', icon: '⏳', color: '#f59e0b' },
                { value: 'em_separacao', label: 'Em Separação', icon: '📦', color: '#3b82f6' },
                { value: 'em_expedicao', label: 'Em Expedição', icon: '🚛', color: '#8b5cf6' },
                { value: 'em_transporte', label: 'Em Transporte', icon: '🚚', color: '#ec4899' },
                { value: 'entregue', label: 'Entregue', icon: '✅', color: '#10b981' }
            ];

            const modal = document.createElement('div');
            modal.className = 'aluforce-modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;

            modal.innerHTML = `
                <div class="aluforce-modal-box" style="
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-width: 380px;
                    width: 90%;
                    transform: scale(0.9);
                    transition: transform 0.2s ease;
                    overflow: hidden;
                ">
                    <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
                        <h3 style="
                            margin: 0;
                            font-size: 16px;
                            font-weight: 600;
                            color: #1e293b;
                            font-family: 'Inter', sans-serif;
                        ">Alterar Status - Pedido #${pedidoId}</h3>
                    </div>
                    <div style="padding: 16px 24px;">
                        <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">Selecione o novo status:</p>
                        <div class="status-options" style="display: flex; flex-direction: column; gap: 8px;">
                            ${statusOptions.map(opt => `
                                <button class="status-option" data-value="${opt.value}" style="
                                    display: flex;
                                    align-items: center;
                                    gap: 12px;
                                    padding: 12px 16px;
                                    border: 2px solid ${currentStatus === opt.value ? opt.color : '#e2e8f0'};
                                    background: ${currentStatus === opt.value ? opt.color + '10' : '#ffffff'};
                                    border-radius: 10px;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    font-family: 'Inter', sans-serif;
                                ">
                                    <span style="font-size: 20px;">${opt.icon}</span>
                                    <span style="font-size: 14px; font-weight: 500; color: #1e293b;">${opt.label}</span>
                                    ${currentStatus === opt.value ? '<span style="margin-left: auto; font-size: 12px; color: ' + opt.color + '; font-weight: 600;">ATUAL</span>' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div style="
                        padding: 16px 24px;
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: flex-end;
                    ">
                        <button class="modal-btn-cancel" style="
                            padding: 10px 24px;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            font-family: 'Inter', sans-serif;
                        ">Cancelar</button>
                    </div>
                </div>
            `;

            container.appendChild(modal);

            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(1)';
            });

            const closeModal = (value) => {
                modal.style.opacity = '0';
                modal.querySelector('.aluforce-modal-box').style.transform = 'scale(0.9)';
                setTimeout(() => {
                    modal.remove();
                    resolve(value);
                }, 200);
            };

            modal.querySelectorAll('.status-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    closeModal(btn.dataset.value);
                });
                btn.addEventListener('mouseenter', () => {
                    if (btn.dataset.value !== currentStatus) {
                        btn.style.borderColor = '#10b981';
                        btn.style.background = '#f0fdf4';
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    const opt = statusOptions.find(o => o.value === btn.dataset.value);
                    btn.style.borderColor = currentStatus === btn.dataset.value ? opt.color : '#e2e8f0';
                    btn.style.background = currentStatus === btn.dataset.value ? opt.color + '10' : '#ffffff';
                });
            });

            modal.querySelector('.modal-btn-cancel').addEventListener('click', () => closeModal(null));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(null);
            });
        });
    };

    // Sobrescrever funções nativas (opcional)
    // window.alert = (msg) => showAlert(msg);
    // window.confirm = (msg) => showConfirm(msg);
    // window.prompt = (msg, def) => showPrompt(msg, def);

    console.log('✅ Sistema de Toasts e Modais ALUFORCE carregação');
})();
