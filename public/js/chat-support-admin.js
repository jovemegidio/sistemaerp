/**
 * ALUFORCE CHAT - ÁREA DE SUPORTE (TI)
 * Sistema de tickets e atendimento para administrador TI
 * @version 1.0
 */

(function() {
    'use strict';

    // ===== VERIFICAR SE É USUÁRIO TI =====
    function isSupportUser() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const supportEmails = ['ti@aluforce.ind.br', 'tialuforce@gmail.com', 'admin@aluforce.ind.br'];
        return supportEmails.includes(userData.email?.toLowerCase());
    }

    // Se não for usuário de suporte, não carregar este módulo
    if (!isSupportUser()) {
        console.log('👤 Usuário padrão - carregando chat Omie normal');
        return;
    }

    console.log('🛠️ Usuário TI detectado - carregando área de suporte');

    // ===== ESTADO DO SUPORTE =====
    const supportState = {
        tickets: [],
        activeTicket: null,
        users: [],
        stats: {
            open: 0,
            pending: 0,
            resolved: 0,
            total: 0
        }
    };

    // ===== CRIAR INTERFACE DE SUPORTE =====
    function createSupportHTML() {
        const html = `
        <!-- Chat de Suporte (TI) -->
        <div class="chat-support-container" id="chatSupport">
            <!-- Header de Suporte -->
            <div class="support-header">
                <div class="support-header-left">
                    <div class="support-icon">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div>
                        <div class="support-title">Central de Suporte</div>
                        <div class="support-subtitle">Atendimento TI - ALUFORCE</div>
                    </div>
                </div>
                <div class="support-header-actions">
                    <button class="support-action-btn" id="supportRefreshBtn" title="Atualizar">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="support-action-btn" id="supportMinimizeBtn" title="Minimizar">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="support-action-btn" id="supportCloseBtn" title="Fechar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Estatísticas -->
            <div class="support-stats">
                <div class="stat-card stat-open">
                    <div class="stat-value" id="statOpen">0</div>
                    <div class="stat-label">Abertos</div>
                </div>
                <div class="stat-card stat-pending">
                    <div class="stat-value" id="statPending">0</div>
                    <div class="stat-label">Pendentes</div>
                </div>
                <div class="stat-card stat-resolved">
                    <div class="stat-value" id="statResolved">0</div>
                    <div class="stat-label">Resolvidos</div>
                </div>
                <div class="stat-card stat-total">
                    <div class="stat-value" id="statTotal">0</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="support-filters">
                <button class="filter-btn active" data-filter="all">
                    Todos <span class="filter-count" id="filterAll">0</span>
                </button>
                <button class="filter-btn" data-filter="open">
                    Abertos <span class="filter-count" id="filterOpen">0</span>
                </button>
                <button class="filter-btn" data-filter="pending">
                    Pendentes <span class="filter-count" id="filterPending">0</span>
                </button>
                <button class="filter-btn" data-filter="resolved">
                    Resolvidos <span class="filter-count" id="filterResolved">0</span>
                </button>
            </div>

            <!-- Lista de Tickets -->
            <div class="support-tickets-container">
                <div class="support-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Buscar por usuário, assunto ou ticket..." id="supportSearch">
                </div>
                
                <div class="support-tickets-list" id="supportTicketsList">
                    <!-- Tickets serão carregados aqui -->
                    <div class="empty-tickets">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                        <h3>Nenhum ticket encontrado</h3>
                        <p>Aguardando solicitações de usuários...</p>
                    </div>
                </div>
            </div>

            <!-- Detalhes do Ticket -->
            <div class="support-ticket-detail" id="supportTicketDetail" style="display: none;">
                <div class="ticket-detail-header">
                    <button class="back-btn" id="backToListBtn">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="ticket-detail-info">
                        <div class="ticket-number" id="detailTicketNumber">#0000</div>
                        <div class="ticket-status-badge" id="detailTicketStatus">Aberto</div>
                    </div>
                    <div class="ticket-actions">
                        <button class="ticket-action-btn" id="resolveTicketBtn">
                            <i class="fas fa-check"></i> Resolver
                        </button>
                        <button class="ticket-action-btn danger" id="closeTicketBtn">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                </div>

                <div class="ticket-detail-user">
                    <div class="user-avatar" id="detailUserAvatar">U</div>
                    <div class="user-info">
                        <div class="user-name" id="detailUserName">Nome do Usuário</div>
                        <div class="user-email" id="detailUserEmail">email@example.com</div>
                        <div class="user-department" id="detailUserDepartment">Departamento</div>
                    </div>
                    <div class="ticket-time" id="detailTicketTime">Há 5 minutos</div>
                </div>

                <div class="ticket-detail-subject">
                    <strong>Assunto:</strong>
                    <span id="detailTicketSubject">Assunto do ticket</span>
                </div>

                <div class="ticket-messages-container" id="ticketMessagesContainer">
                    <!-- Mensagens do ticket -->
                </div>

                <div class="ticket-reply-container">
                    <textarea 
                        class="ticket-reply-input" 
                        id="ticketReplyInput" 
                        placeholder="Digite sua resposta..."
                        rows="3"
                    ></textarea>
                    <div class="reply-actions">
                        <button class="btn-attach">
                            <i class="fas fa-paperclip"></i> Anexar
                        </button>
                        <button class="btn-send-reply" id="sendReplyBtn">
                            <i class="fas fa-paper-plane"></i> Enviar Resposta
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Botão Flutuante de Suporte -->
        <button class="support-floating-btn" id="supportFloatingBtn">
            <div class="floating-icon">
                <i class="fas fa-headset"></i>
            </div>
            <span class="support-badge" id="supportBadge" style="display: none;">0</span>
            <div class="floating-pulse"></div>
        </button>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    // ===== CRIAR CSS DE SUPORTE =====
    function injectSupportCSS() {
        const css = `
        <style id="chat-support-styles">
        /* Suporte Container */
        .chat-support-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 450px;
            height: 650px;
            max-height: calc(100vh - 48px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            display: none;
            flex-direction: column;
            z-index: 9998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }

        .chat-support-container.active {
            display: flex;
            animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header de Suporte */
        .support-header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: white;
            flex-shrink: 0;
        }

        .support-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .support-icon {
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .support-title {
            font-size: 16px;
            font-weight: 700;
        }

        .support-subtitle {
            font-size: 12px;
            opacity: 0.9;
        }

        .support-header-actions {
            display: flex;
            gap: 8px;
        }

        .support-action-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .support-action-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        /* Estatísticas */
        .support-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e5e7eb;
        }

        .stat-card {
            text-align: center;
            padding: 12px 8px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .stat-value {
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 4px;
        }

        .stat-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
        }

        .stat-open .stat-value { color: #3b82f6; }
        .stat-pending .stat-value { color: #f59e0b; }
        .stat-resolved .stat-value { color: #10b981; }
        .stat-total .stat-value { color: #6b7280; }

        /* Filtros */
        .support-filters {
            display: flex;
            gap: 8px;
            padding: 12px 20px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            overflow-x: auto;
        }

        .filter-btn {
            padding: 8px 16px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .filter-btn:hover {
            background: #e2e8f0;
        }

        .filter-btn.active {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
        }

        .filter-count {
            background: rgba(0, 0, 0, 0.15);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
        }

        .filter-btn.active .filter-count {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Container de Tickets */
        .support-tickets-container {
            flex: 1;
            overflow-y: auto;
            background: #f8fafc;
        }

        .support-search {
            padding: 16px 20px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .support-search i {
            color: #9ca3af;
        }

        .support-search input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 14px;
            outline: none;
            color: #1f2937;
        }

        .support-search input::placeholder {
            color: #9ca3af;
        }

        /* Lista de Tickets */
        .support-tickets-list {
            padding: 12px 20px;
        }

        .ticket-item {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid transparent;
        }

        .ticket-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .ticket-item.status-open {
            border-left-color: #3b82f6;
        }

        .ticket-item.status-pending {
            border-left-color: #f59e0b;
        }

        .ticket-item.status-resolved {
            border-left-color: #10b981;
        }

        .ticket-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .ticket-number {
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
        }

        .ticket-status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .ticket-status-badge.open {
            background: #dbeafe;
            color: #1e40af;
        }

        .ticket-status-badge.pending {
            background: #fef3c7;
            color: #92400e;
        }

        .ticket-status-badge.resolved {
            background: #d1fae5;
            color: #065f46;
        }

        .ticket-item-user {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
        }

        .ticket-item-info {
            flex: 1;
        }

        .ticket-user-name {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
        }

        .ticket-user-email {
            font-size: 12px;
            color: #6b7280;
        }

        .ticket-subject {
            font-size: 14px;
            color: #1f2937;
            margin-bottom: 8px;
            font-weight: 500;
        }

        .ticket-preview {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .ticket-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: #9ca3af;
        }

        .ticket-time {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .ticket-unread {
            background: #ef4444;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
        }

        /* Empty State */
        .empty-tickets {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
        }

        .empty-tickets h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 8px 0;
        }

        .empty-tickets p {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
        }

        /* Detalhes do Ticket */
        .support-ticket-detail {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: flex;
            flex-direction: column;
            z-index: 10;
        }

        .ticket-detail-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .back-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: white;
            border: 1px solid #e5e7eb;
            color: #6b7280;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .back-btn:hover {
            background: #f1f5f9;
            color: #1f2937;
        }

        .ticket-detail-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ticket-actions {
            display: flex;
            gap: 8px;
        }

        .ticket-action-btn {
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }

        .ticket-action-btn:not(.danger) {
            background: #10b981;
            color: white;
        }

        .ticket-action-btn.danger {
            background: #ef4444;
            color: white;
        }

        .ticket-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .ticket-detail-user {
            padding: 20px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .user-info {
            flex: 1;
        }

        .user-name {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 4px;
        }

        .user-email {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 2px;
        }

        .user-department {
            font-size: 12px;
            color: #9ca3af;
        }

        .ticket-detail-subject {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            color: #1f2937;
        }

        .ticket-detail-subject strong {
            font-weight: 700;
            margin-right: 8px;
        }

        /* Mensagens do Ticket */
        .ticket-messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9fafb;
        }

        .ticket-message {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .ticket-message.user {
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
        }

        .ticket-message.user .message-avatar {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
        }

        .ticket-message.support .message-avatar {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }

        .message-content {
            flex: 1;
            max-width: 75%;
        }

        .ticket-message.user .message-content {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .message-bubble {
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 4px;
        }

        .ticket-message.user .message-bubble {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border-radius: 16px 16px 4px 16px;
        }

        .ticket-message.support .message-bubble {
            background: white;
            color: #1f2937;
            border-radius: 16px 16px 16px 4px;
            border: 1px solid #e5e7eb;
        }

        .message-time {
            font-size: 11px;
            color: #9ca3af;
            padding: 0 4px;
        }

        /* Responder Ticket */
        .ticket-reply-container {
            padding: 16px 20px;
            background: white;
            border-top: 2px solid #e5e7eb;
        }

        .ticket-reply-input {
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 12px;
            transition: all 0.2s;
        }

        .ticket-reply-input:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .reply-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .btn-attach {
            padding: 8px 16px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }

        .btn-attach:hover {
            background: #e2e8f0;
        }

        .btn-send-reply {
            padding: 10px 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .btn-send-reply:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Botão Flutuante de Suporte */
        .support-floating-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
            z-index: 9997;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
        }

        .chat-support-container.active ~ .support-floating-btn {
            display: none;
        }

        .support-floating-btn:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 12px 32px rgba(239, 68, 68, 0.5);
        }

        .support-floating-btn .floating-icon {
            color: white;
            font-size: 28px;
        }

        .support-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #fbbf24;
            color: #78350f;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 700;
            min-width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
            border: 2px solid white;
        }

        /* Responsive */
        @media (max-width: 480px) {
            .chat-support-container {
                width: calc(100vw - 16px);
                height: calc(100vh - 16px);
                bottom: 8px;
                right: 8px;
                border-radius: 12px;
            }

            .support-floating-btn {
                bottom: 16px;
                right: 16px;
                width: 56px;
                height: 56px;
            }

            .support-floating-btn .floating-icon {
                font-size: 24px;
            }

            .support-stats {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        /* Scrollbar Customizado */
        .support-tickets-container::-webkit-scrollbar,
        .ticket-messages-container::-webkit-scrollbar {
            width: 6px;
        }

        .support-tickets-container::-webkit-scrollbar-track,
        .ticket-messages-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .support-tickets-container::-webkit-scrollbar-thumb,
        .ticket-messages-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }

        .support-tickets-container::-webkit-scrollbar-thumb:hover,
        .ticket-messages-container::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', css);
    }

    // ===== DADOS DE EXEMPLO =====
    const sampleTickets = [
        {
            id: 1001,
            number: '#1001',
            user: {
                name: 'Antonio Carlos',
                email: 'antonio@aluforce.ind.br',
                department: 'Diretoria',
                avatar: 'A'
            },
            subject: 'Erro ao gerar relatório de vendas',
            message: 'Estou tentando gerar o relatório de vendas do mês mas está dando erro de timeout.',
            status: 'open',
            priority: 'high',
            created: new Date(Date.now() - 300000), // 5 min atrás
            messages: [
                {
                    type: 'user',
                    text: 'Estou tentando gerar o relatório de vendas do mês mas está dando erro de timeout.',
                    time: new Date(Date.now() - 300000)
                }
            ],
            unread: true
        },
        {
            id: 1002,
            number: '#1002',
            user: {
                name: 'Isabela Rodrigues',
                email: 'isabela@aluforce.ind.br',
                department: 'RH',
                avatar: 'I'
            },
            subject: 'Não consigo acessar folha de pagamento',
            message: 'Ao tentar acessar a folha de pagamento, aparece erro 403 - Acesso Negado.',
            status: 'pending',
            priority: 'medium',
            created: new Date(Date.now() - 3600000), // 1h atrás
            messages: [
                {
                    type: 'user',
                    text: 'Ao tentar acessar a folha de pagamento, aparece erro 403 - Acesso Negado.',
                    time: new Date(Date.now() - 3600000)
                },
                {
                    type: 'support',
                    text: 'Olá Isabela! Estou verificando suas permissões no sistema. Aguarde alguns minutos.',
                    time: new Date(Date.now() - 3000000)
                }
            ],
            unread: true
        },
        {
            id: 1003,
            number: '#1003',
            user: {
                name: 'Thiago Oliveira',
                email: 'thiago@aluforce.ind.br',
                department: 'Produção',
                avatar: 'T'
            },
            subject: 'Preciso cadastrar novo material',
            message: 'Como faço para cadastrar um novo material no sistema PCP?',
            status: 'resolved',
            priority: 'low',
            created: new Date(Date.now() - 86400000), // 1 dia atrás
            messages: [
                {
                    type: 'user',
                    text: 'Como faço para cadastrar um novo material no sistema PCP?',
                    time: new Date(Date.now() - 86400000)
                },
                {
                    type: 'support',
                    text: 'Olá Thiago! Para cadastrar um novo material: 1) Acesse PCP > Materiais, 2) Clique em "Novo Material", 3) Preencha os dados obrigatórios.',
                    time: new Date(Date.now() - 86000000)
                },
                {
                    type: 'user',
                    text: 'Perfeito! Consegui cadastrar. Muito obrigado!',
                    time: new Date(Date.now() - 85000000)
                }
            ],
            unread: false
        }
    ];

    // ===== FUNÇÕES =====
    async function loadTickets() {
        try {
            // Tentar carregar da API
            const response = await fetch('/api/suporte/tickets/pendentes');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.tickets) {
                    // Mapear tickets da API para o formato do front
                    supportState.tickets = data.tickets.map(t => ({
                        id: t.id,
                        number: `#${t.id}`,
                        user: {
                            name: t.usuario || t.nomeUsuario || 'Usuário',
                            email: t.email || 'usuario@aluforce.ind.br',
                            department: t.departamento || 'Geral',
                            avatar: (t.usuario || t.nomeUsuario || 'U').charAt(0).toUpperCase()
                        },
                        subject: t.assunto || t.titulo || 'Sem assunto',
                        message: t.mensagem || t.descricao || '',
                        status: mapStatus(t.status),
                        priority: t.prioridade || 'medium',
                        created: new Date(t.criadoEm || Date.now()),
                        messages: (t.respostas || []).map(r => ({
                            type: r.atendente ? 'support' : 'user',
                            text: r.texto || r.mensagem,
                            time: new Date(r.criadoEm || Date.now())
                        })),
                        unread: t.status === 'pendente' || t.status === 'aberto'
                    }));
                    
                    // Adicionar mensagem inicial se não houver
                    supportState.tickets.forEach(ticket => {
                        if (ticket.messages.length === 0 && ticket.message) {
                            ticket.messages.unshift({
                                type: 'user',
                                text: ticket.message,
                                time: ticket.created
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.log('Usando tickets de exemplo:', error.message);
            supportState.tickets = sampleTickets;
        }
        
        updateStats();
        renderTickets();
    }
    
    function mapStatus(apiStatus) {
        const statusMap = {
            'pendente': 'open',
            'aberto': 'open',
            'em_andamento': 'pending',
            'aguardando': 'pending',
            'resolvido': 'resolved',
            'fechado': 'resolved'
        };
        return statusMap[apiStatus] || 'open';
    }
    
    function mapStatusToApi(frontStatus) {
        const statusMap = {
            'open': 'aberto',
            'pending': 'em_andamento',
            'resolved': 'resolvido'
        };
        return statusMap[frontStatus] || 'aberto';
    }

    function updateStats() {
        const stats = {
            open: supportState.tickets.filter(t => t.status === 'open').length,
            pending: supportState.tickets.filter(t => t.status === 'pending').length,
            resolved: supportState.tickets.filter(t => t.status === 'resolved').length,
            total: supportState.tickets.length
        };

        supportState.stats = stats;

        document.getElementById('statOpen').textContent = stats.open;
        document.getElementById('statPending').textContent = stats.pending;
        document.getElementById('statResolved').textContent = stats.resolved;
        document.getElementById('statTotal').textContent = stats.total;

        document.getElementById('filterAll').textContent = stats.total;
        document.getElementById('filterOpen').textContent = stats.open;
        document.getElementById('filterPending').textContent = stats.pending;
        document.getElementById('filterResolved').textContent = stats.resolved;

        // Atualizar badge
        const unreadCount = supportState.tickets.filter(t => t.unread).length;
        const badge = document.getElementById('supportBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function renderTickets(filter = 'all') {
        const container = document.getElementById('supportTicketsList');
        let tickets = supportState.tickets;

        if (filter !== 'all') {
            tickets = tickets.filter(t => t.status === filter);
        }

        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-tickets">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i>
                    <h3>Nenhum ticket encontrado</h3>
                    <p>Aguardando solicitações de usuários...</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tickets.map(ticket => {
            const statusLabels = {
                open: { text: 'Aberto', class: 'open' },
                pending: { text: 'Pendente', class: 'pending' },
                resolved: { text: 'Resolvido', class: 'resolved' }
            };

            const status = statusLabels[ticket.status] || statusLabels.open;
            const timeAgo = formatTimeAgo(ticket.created);

            return `
                <div class="ticket-item status-${ticket.status}" data-ticket-id="${ticket.id}">
                    <div class="ticket-item-header">
                        <span class="ticket-number">${ticket.number}</span>
                        <span class="ticket-status-badge ${status.class}">${status.text}</span>
                    </div>
                    <div class="ticket-item-user">
                        <div class="user-avatar" style="background: ${getAvatarColor(ticket.user.avatar)};">
                            ${ticket.user.avatar}
                        </div>
                        <div class="ticket-item-info">
                            <div class="ticket-user-name">${ticket.user.name}</div>
                            <div class="ticket-user-email">${ticket.user.email}</div>
                        </div>
                    </div>
                    <div class="ticket-subject">${ticket.subject}</div>
                    <div class="ticket-preview">${ticket.message}</div>
                    <div class="ticket-meta">
                        <div class="ticket-time">
                            <i class="fas fa-clock"></i> ${timeAgo}
                        </div>
                        ${ticket.unread ? '<span class="ticket-unread">Nova</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Adicionar eventos de clique
        container.querySelectorAll('.ticket-item').forEach(item => {
            item.addEventListener('click', () => {
                const ticketId = parseInt(item.dataset.ticketId);
                openTicketDetail(ticketId);
            });
        });
    }

    function openTicketDetail(ticketId) {
        const ticket = supportState.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        supportState.activeTicket = ticket;
        ticket.unread = false;

        // Preencher dados
        document.getElementById('detailTicketNumber').textContent = ticket.number;
        document.getElementById('detailTicketStatus').textContent = 
            ticket.status === 'open' ? 'Aberto' : ticket.status === 'pending' ? 'Pendente' : 'Resolvido';
        document.getElementById('detailTicketStatus').className = 
            `ticket-status-badge ${ticket.status}`;

        document.getElementById('detailUserAvatar').textContent = ticket.user.avatar;
        document.getElementById('detailUserAvatar').style.background = getAvatarColor(ticket.user.avatar);
        document.getElementById('detailUserName').textContent = ticket.user.name;
        document.getElementById('detailUserEmail').textContent = ticket.user.email;
        document.getElementById('detailUserDepartment').textContent = ticket.user.department;
        document.getElementById('detailTicketTime').textContent = formatTimeAgo(ticket.created);
        document.getElementById('detailTicketSubject').textContent = ticket.subject;

        // Renderizar mensagens
        const messagesContainer = document.getElementById('ticketMessagesContainer');
        messagesContainer.innerHTML = ticket.messages.map(msg => `
            <div class="ticket-message ${msg.type}">
                <div class="message-avatar" style="background: ${msg.type === 'user' ? getAvatarColor(ticket.user.avatar) : 'linear-gradient(135deg, #ef4444, #dc2626)'};">
                    ${msg.type === 'user' ? ticket.user.avatar : 'TI'}
                </div>
                <div class="message-content">
                    <div class="message-bubble">${msg.text}</div>
                    <div class="message-time">${formatTimeAgo(msg.time)}</div>
                </div>
            </div>
        `).join('');

        // Mostrar detalhes
        document.getElementById('supportTicketDetail').style.display = 'flex';

        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);

        updateStats();
    }

    function closeTicketDetail() {
        document.getElementById('supportTicketDetail').style.display = 'none';
        supportState.activeTicket = null;
        document.getElementById('ticketReplyInput').value = '';
    }

    async function sendReply() {
        const input = document.getElementById('ticketReplyInput');
        const text = input.value.trim();

        if (!text || !supportState.activeTicket) return;

        const message = {
            type: 'support',
            text: text,
            time: new Date()
        };

        // Enviar para o servidor
        try {
            const response = await fetch(`/api/suporte/tickets/${supportState.activeTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resposta: text,
                    atendente: 'Suporte TI',
                    status: 'em_andamento'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Resposta enviada:', data);
            }
        } catch (error) {
            console.error('Erro ao enviar resposta:', error);
        }

        supportState.activeTicket.messages.push(message);
        supportState.activeTicket.status = 'pending';

        // Re-renderizar mensagens
        openTicketDetail(supportState.activeTicket.id);
        input.value = '';

        // Scroll to bottom
        const messagesContainer = document.getElementById('ticketMessagesContainer');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    async function resolveTicket() {
        if (!supportState.activeTicket) return;

        // Enviar para o servidor
        try {
            const response = await fetch(`/api/suporte/tickets/${supportState.activeTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'resolvido',
                    atendente: 'Suporte TI'
                })
            });
            
            if (response.ok) {
                console.log('✅ Ticket resolvido no servidor');
            }
        } catch (error) {
            console.error('Erro ao resolver ticket:', error);
        }

        supportState.activeTicket.status = 'resolved';
        supportState.activeTicket.unread = false;

        updateStats();
        openTicketDetail(supportState.activeTicket.id);
        renderTickets();

        alert('Ticket marcado como resolvido!');
    }

    function getAvatarColor(initial) {
        const colors = {
            'A': 'linear-gradient(135deg, #3b82f6, #2563eb)',
            'I': 'linear-gradient(135deg, #ec4899, #db2777)',
            'T': 'linear-gradient(135deg, #10b981, #059669)',
            'C': 'linear-gradient(135deg, #f59e0b, #d97706)',
            'E': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            'R': 'linear-gradient(135deg, #ef4444, #dc2626)'
        };
        return colors[initial] || 'linear-gradient(135deg, #6b7280, #4b5563)';
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Agora mesmo';
        if (seconds < 3600) return `Há ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Há ${Math.floor(seconds / 3600)}h`;
        return `Há ${Math.floor(seconds / 86400)} dias`;
    }

    // ===== EVENTOS =====
    function attachEvents() {
        // Toggle suporte
        document.getElementById('supportFloatingBtn').addEventListener('click', () => {
            document.getElementById('chatSupport').classList.add('active');
            loadTickets();
        });

        document.getElementById('supportCloseBtn').addEventListener('click', () => {
            document.getElementById('chatSupport').classList.remove('active');
        });

        document.getElementById('supportMinimizeBtn').addEventListener('click', () => {
            document.getElementById('chatSupport').classList.remove('active');
        });

        // Refresh
        document.getElementById('supportRefreshBtn').addEventListener('click', loadTickets);

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTickets(btn.dataset.filter);
            });
        });

        // Busca
        document.getElementById('supportSearch').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.ticket-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'block' : 'none';
            });
        });

        // Voltar da visualização
        document.getElementById('backToListBtn').addEventListener('click', closeTicketDetail);

        // Responder
        document.getElementById('sendReplyBtn').addEventListener('click', sendReply);
        document.getElementById('ticketReplyInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                sendReply();
            }
        });

        // Resolver ticket
        document.getElementById('resolveTicketBtn').addEventListener('click', resolveTicket);

        // Fechar ticket
        document.getElementById('closeTicketBtn').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja fechar este ticket?')) {
                resolveTicket();
                closeTicketDetail();
            }
        });
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        createSupportHTML();
        injectSupportCSS();
        attachEvents();
        loadTickets();

        console.log('✅ Central de Suporte TI inicializada');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
