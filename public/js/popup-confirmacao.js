/**
 * =====================================================
 * POPUP DE CONFIRMAÇÃO PROFISSIONAL - ALUFORCE
 * Sistema de modais e toasts personalizados
 * =====================================================
 */

const Popup = (function() {
    'use strict';

    // Container de toasts
    let toastContainer = null;

    // Inicializar
    function init() {
        // Criar container de toasts se não existir
        if (!document.querySelector('.toast-container')) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        } else {
            toastContainer = document.querySelector('.toast-container');
        }
    }

    // Criar estrutura do popup
    function createPopup(options) {
        const defaults = {
            type: 'question', // question, warning, danger, success, info
            title: 'Confirmação',
            subtitle: '',
            message: 'Deseja continuar?',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            confirmIcon: 'fas fa-check',
            cancelIcon: 'fas fa-times',
            showCancel: true,
            inputType: null, // 'text', 'password', 'email', etc
            inputPlaceholder: '',
            inputValue: '',
            onConfirm: null,
            onCancel: null,
            dangerous: false
        };

        const config = { ...defaults, ...options };

        // Determinar ícone baseado no tipo
        const icons = {
            question: 'fas fa-question',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-trash-alt',
            success: 'fas fa-check-circle',
            info: 'fas fa-info-circle'
        };

        // Determinar classe do botão confirmar
        let btnClass = 'popup-btn-confirm';
        if (config.dangerous || config.type === 'danger') {
            btnClass = 'popup-btn-danger';
        } else if (config.type === 'success') {
            btnClass = 'popup-btn-success';
        } else if (config.type === 'warning') {
            btnClass = 'popup-btn-warning';
        }

        // HTML do popup
        const html = `
            <div class="popup-overlay" id="popup-overlay">
                <div class="popup-container">
                    <div class="popup-header">
                        <div class="popup-icon ${config.type}">
                            <i class="${icons[config.type] || icons.question}"></i>
                        </div>
                        <div class="popup-header-text">
                            <h3 class="popup-title">${config.title}</h3>
                            ${config.subtitle ? `<p class="popup-subtitle">${config.subtitle}</p>` : ''}
                        </div>
                    </div>
                    <div class="popup-body">
                        <p class="popup-message">${config.message}</p>
                        ${config.inputType ? `
                            <input type="${config.inputType}" 
                                   class="popup-input" 
                                   id="popup-input"
                                   placeholder="${config.inputPlaceholder}"
                                   value="${config.inputValue}">
                        ` : ''}
                    </div>
                    <div class="popup-footer">
                        ${config.showCancel ? `
                            <button class="popup-btn popup-btn-cancel" id="popup-cancel">
                                <i class="${config.cancelIcon}"></i>
                                ${config.cancelText}
                            </button>
                        ` : ''}
                        <button class="popup-btn ${btnClass}" id="popup-confirm">
                            <i class="${config.confirmIcon}"></i>
                            ${config.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        return { html, config };
    }

    // Mostrar popup
    function show(options) {
        return new Promise((resolve) => {
            const { html, config } = createPopup(options);

            // Remover popup existente se houver
            const existingPopup = document.getElementById('popup-overlay');
            if (existingPopup) {
                existingPopup.remove();
            }

            // Inserir novo popup
            document.body.insertAdjacentHTML('beforeend', html);
            const overlay = document.getElementById('popup-overlay');
            const container = overlay.querySelector('.popup-container');
            const confirmBtn = document.getElementById('popup-confirm');
            const cancelBtn = document.getElementById('popup-cancel');
            const input = document.getElementById('popup-input');

            // Ativar com delay para animação
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                if (input) {
                    setTimeout(() => input.focus(), 300);
                }
            });

            // Função para fechar
            function close(result) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                }, 300);
                resolve(result);
            }

            // Event listeners
            confirmBtn.addEventListener('click', () => {
                const value = input ? input.value : true;
                if (config.onConfirm) config.onConfirm(value);
                close({ confirmed: true, value });
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (config.onCancel) config.onCancel();
                    close({ confirmed: false, value: null });
                });
            }

            // Fechar ao clicar no overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (config.onCancel) config.onCancel();
                    close({ confirmed: false, value: null });
                }
            });

            // Teclas de atalho
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    if (config.onCancel) config.onCancel();
                    close({ confirmed: false, value: null });
                    document.removeEventListener('keydown', handler);
                } else if (e.key === 'Enter' && !config.inputType) {
                    if (config.onConfirm) config.onConfirm(true);
                    close({ confirmed: true, value: true });
                    document.removeEventListener('keydown', handler);
                } else if (e.key === 'Enter' && config.inputType && input.value) {
                    if (config.onConfirm) config.onConfirm(input.value);
                    close({ confirmed: true, value: input.value });
                    document.removeEventListener('keydown', handler);
                }
            });
        });
    }

    // Métodos de conveniência
    function confirm(message, title = 'Confirmação') {
        return show({
            type: 'question',
            title: title,
            message: message,
            confirmText: 'Sim',
            cancelText: 'Não',
            confirmIcon: 'fas fa-check',
            cancelIcon: 'fas fa-times'
        });
    }

    function confirmDelete(itemName = 'este item') {
        return show({
            type: 'danger',
            title: 'Excluir Item',
            subtitle: 'Esta ação não pode ser desfeita',
            message: `Deseja realmente excluir <strong>${itemName}</strong>?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            confirmIcon: 'fas fa-trash-alt',
            dangerous: true
        });
    }

    function alert(message, title = 'Aviso', type = 'info') {
        return show({
            type: type,
            title: title,
            message: message,
            confirmText: 'OK',
            confirmIcon: 'fas fa-check',
            showCancel: false
        });
    }

    function success(message, title = 'Sucesso') {
        return show({
            type: 'success',
            title: title,
            message: message,
            confirmText: 'OK',
            confirmIcon: 'fas fa-check',
            showCancel: false
        });
    }

    function warning(message, title = 'Atenção') {
        return show({
            type: 'warning',
            title: title,
            message: message,
            confirmText: 'OK',
            confirmIcon: 'fas fa-check',
            showCancel: false
        });
    }

    function error(message, title = 'Erro') {
        return show({
            type: 'danger',
            title: title,
            message: message,
            confirmText: 'OK',
            confirmIcon: 'fas fa-check',
            showCancel: false
        });
    }

    function prompt(message, title = 'Digite', defaultValue = '') {
        return show({
            type: 'question',
            title: title,
            message: message,
            inputType: 'text',
            inputValue: defaultValue,
            inputPlaceholder: 'Digite aqui...',
            confirmText: 'OK',
            cancelText: 'Cancelar'
        });
    }

    // Toast notifications
    function toast(options) {
        init();

        const defaults = {
            type: 'info', // success, error, warning, info
            title: '',
            message: '',
            duration: 4000,
            closable: true
        };

        const config = { ...defaults, ...options };

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const toastEl = document.createElement('div');
        toastEl.className = `toast ${config.type}`;
        toastEl.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[config.type]}"></i>
            </div>
            <div class="toast-content">
                ${config.title ? `<p class="toast-title">${config.title}</p>` : ''}
                <p class="toast-message">${config.message}</p>
            </div>
            ${config.closable ? `
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
            <div class="toast-progress" style="animation-duration: ${config.duration}ms"></div>
        `;

        toastContainer.appendChild(toastEl);

        // Mostrar com animação
        requestAnimationFrame(() => {
            toastEl.classList.add('show');
        });

        // Função para remover
        function remove() {
            toastEl.classList.remove('show');
            toastEl.classList.add('hide');
            setTimeout(() => {
                toastEl.remove();
            }, 400);
        }

        // Auto remover
        const timeout = setTimeout(remove, config.duration);

        // Botão fechar
        const closeBtn = toastEl.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeout);
                remove();
            });
        }

        return { remove };
    }

    // Toasts de conveniência
    toast.success = (message, title = 'Sucesso') => toast({ type: 'success', title, message });
    toast.error = (message, title = 'Erro') => toast({ type: 'error', title, message });
    toast.warning = (message, title = 'Atenção') => toast({ type: 'warning', title, message });
    toast.info = (message, title = 'Info') => toast({ type: 'info', title, message });

    // API pública
    return {
        show,
        confirm,
        confirmDelete,
        alert,
        success,
        warning,
        error,
        prompt,
        toast,
        init
    };
})();

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    Popup.init();
});

// Sobrescrever confirm e alert nativos (opcional)
// window.confirm = (msg) => Popup.confirm(msg);
// window.alert = (msg) => Popup.alert(msg);

// Exportar para uso global
window.Popup = Popup;
