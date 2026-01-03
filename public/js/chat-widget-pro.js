/**
 * ALUFORCE CHAT WIDGET PRO - IA AVANÇADA
 * Sistema de chat inteligente com visual moderno
 * @version 2.0
 */

(function() {
    'use strict';

    // ===== CONFIGURAÇÕES =====
    const CONFIG = {
        serverUrl: window.location.origin,
        apiKey: 'aluforce-api-2025',
        reconnectAttempts: 10,
        reconnectDelay: 2000,
        typingDelay: 800,
        maxContextMessages: 10,
        voice: {
            enabled: true,
            lang: 'pt-BR',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        }
    };

    // ===== ESTADO GLOBAL =====
    const state = {
        socket: null,
        user: {
            id: null,
            name: null,
            email: null,
            sessionId: null
        },
        conversation: {
            messages: [],
            context: [],
            topics: new Set(),
            currentIntent: null
        },
        ui: {
            isOpen: false,
            isTyping: false,
            unreadCount: 0,
            voiceEnabled: true,
            isListening: false
        },
        ai: {
            personality: 'friendly',
            language: 'pt-BR',
            confidence: 0.8
        }
    };

    // ===== BASE DE CONHECIMENTO IA =====
    const knowledgeBase = {
        // Saudações e apresentação
        greetings: {
            patterns: /^(oi|olá|ola|hey|opa|e aí|eai|bom dia|boa tarde|boa noite)/i,
            responses: [
                "Olá! 👋 Sou o Bob, seu assistente virtual da ALUFORCE. Como posso ajudar você hoje?",
                "Oi! 😊 Prazer em falar com você! Estou aqui para ajudar. O que você precisa?",
                "Olá! Seja bem-vindo(a)! Sou o Bob e vou te auxiliar. Em que posso ser útil?"
            ]
        },
        
        // Sistema ALUFORCE
        system: {
            patterns: /(sistema|plataforma|aluforce|o que é|como funciona|módulos)/i,
            responses: [
                "O ALUFORCE é um sistema ERP completo com 6 módulos principais:\n\n" +
                "🏭 **PCP** - Planejamento e Controle de Produção\n" +
                "👥 **RH** - Recursos Humanos\n" +
                "🛒 **Compras** - Gestão de Compras\n" +
                "💰 **Financeiro** - Controle Financeiro\n" +
                "📊 **Vendas** - Gestão Comercial\n" +
                "📄 **NFe** - Notas Fiscais e Logística\n\n" +
                "Sobre qual módulo você gostaria de saber mais?"
            ]
        },

        // PCP - Produção
        pcp: {
            patterns: /(pcp|produção|produção|ordem|material|estoque|fabrica)/i,
            responses: [
                "O módulo **PCP** oferece:\n\n" +
                "✓ Controle de Ordens de Produção\n" +
                "✓ Gestão de Materiais e Insumos\n" +
                "✓ Planejamento de Produção\n" +
                "✓ Controle de Estoque\n" +
                "✓ Programação de Faturamento\n\n" +
                "Você quer saber como criar uma ordem de produção ou gerenciar materiais?"
            ]
        },

        // RH - Recursos Humanos
        rh: {
            patterns: /(rh|recursos humanos|funcionário|funcionario|ponto|férias|ferias|folha)/i,
            responses: [
                "O módulo **RH** inclui:\n\n" +
                "✓ Cadastro de Funcionários\n" +
                "✓ Controle de Ponto Eletrônico\n" +
                "✓ Gestão de Férias\n" +
                "✓ Folha de Pagamento\n" +
                "✓ Benefícios\n" +
                "✓ Avaliações de Desempenho\n\n" +
                "Precisa de ajuda com qual funcionalidade?"
            ]
        },

        // Compras
        compras: {
            patterns: /(compra|compras|fornecedor|pedido|cotação|cotação)/i,
            responses: [
                "O módulo de **Compras** permite:\n\n" +
                "✓ Gestão de Fornecedores\n" +
                "✓ Pedidos de Compra\n" +
                "✓ Sistema de Cotações\n" +
                "✓ Aprovações de Pedidos\n" +
                "✓ Controle de Estoque\n" +
                "✓ Relatórios de Compras\n\n" +
                "Como posso auxiliar nas compras?"
            ]
        },

        // Financeiro
        financeiro: {
            patterns: /(financeiro|contas|pagar|receber|fluxo|caixa|dre|boleto)/i,
            responses: [
                "O módulo **Financeiro** oferece:\n\n" +
                "✓ Contas a Pagar\n" +
                "✓ Contas a Receber\n" +
                "✓ Fluxo de Caixa\n" +
                "✓ Conciliação Bancária\n" +
                "✓ DRE - Demonstração de Resultados\n" +
                "✓ Relatórios Financeiros\n\n" +
                "Qual operação financeira você precisa realizar?"
            ]
        },

        // Vendas
        vendas: {
            patterns: /(venda|vendas|cliente|pedido|proposta|crm|comercial)/i,
            responses: [
                "O módulo de **Vendas** possui:\n\n" +
                "✓ CRM - Gestão de Clientes\n" +
                "✓ Pipeline de Vendas\n" +
                "✓ Pedidos e Propostas\n" +
                "✓ Gestão de Empresas\n" +
                "✓ Análise de Performance\n" +
                "✓ Relatórios de Vendas\n\n" +
                "Precisa criar um pedido ou gerenciar clientes?"
            ]
        },

        // NFe e Logística
        nfe: {
            patterns: /(nfe|nota fiscal|logística|logística|entrega|transporte|danfe)/i,
            responses: [
                "O módulo **NFe & Logística** inclui:\n\n" +
                "✓ Emissão de NFe\n" +
                "✓ Consulta de Notas\n" +
                "✓ Certificado Digital\n" +
                "✓ Controle Logístico\n" +
                "✓ Rastreamento de Entregas\n" +
                "✓ Eventos e Manifestações\n\n" +
                "Como posso ajudar com notas fiscais?"
            ]
        },

        // Ajuda e Suporte
        help: {
            patterns: /(ajuda|help|socorro|não entendi|não entendi|como|tutorial)/i,
            responses: [
                "Claro! Estou aqui para ajudar! 😊\n\n" +
                "Você pode me perguntar sobre:\n" +
                "• Funcionalidades dos módulos\n" +
                "• Como realizar tarefas específicas\n" +
                "• Dúvidas sobre o sistema\n" +
                "• Suporte técnico\n\n" +
                "Digite sua dúvida que vou te orientar passo a passo!"
            ]
        },

        // Despedida
        farewell: {
            patterns: /(tchau|adeus|até logo|até logo|valeu|obrigado|obrigada|thanks)/i,
            responses: [
                "Foi um prazer ajudar! 😊 Se precisar, estarei por aqui. Até logo!",
                "Obrigado pelo contato! Volte sempre que precisar. Até mais! 👋",
                "Fico feliz em ter ajudado! Estou sempre disponível. Até breve! ✨"
            ]
        }
    };

    // ===== INTELIGÊNCIA ARTIFICIAL =====
    class AIEngine {
        constructor() {
            this.confidence = 0;
            this.intent = null;
            this.entities = [];
        }

        // Analisar mensagem
        analyze(message) {
            const normalizedMsg = message.toLowerCase().trim();
            
            // Detectar intenção
            for (const [category, data] of Object.entries(knowledgeBase)) {
                if (data.patterns && data.patterns.test(normalizedMsg)) {
                    this.intent = category;
                    this.confidence = 0.9;
                    
                    // Adicionar ao contexto
                    state.conversation.topics.add(category);
                    
                    return {
                        intent: category,
                        confidence: this.confidence,
                        response: this.getResponse(category)
                    };
                }
            }

            // Resposta padrão se não identificar
            return {
                intent: 'unknown',
                confidence: 0.3,
                response: this.getDefaultResponse(normalizedMsg)
            };
        }

        // Obter resposta
        getResponse(category) {
            const data = knowledgeBase[category];
            if (data && data.responses) {
                return data.responses[Math.floor(Math.random() * data.responses.length)];
            }
            return this.getDefaultResponse();
        }

        // Resposta padrão
        getDefaultResponse(message = '') {
            const suggestions = [
                "Desculpe, não entendi bem sua pergunta. 🤔\n\n" +
                "Você pode me perguntar sobre:\n" +
                "• Módulos do sistema (PCP, RH, Compras, etc.)\n" +
                "• Como realizar uma tarefa\n" +
                "• Funcionalidades específicas\n\n" +
                "Como posso ajudar?",
                
                "Hmm, não tenho certeza sobre isso. 😅\n\n" +
                "Que tal me perguntar sobre:\n" +
                "• Produção (PCP)\n" +
                "• Recursos Humanos\n" +
                "• Gestão de Compras\n" +
                "• Controle Financeiro\n\n" +
                "Estou aqui para ajudar!"
            ];

            return suggestions[Math.floor(Math.random() * suggestions.length)];
        }

        // Gerar sugestões contextuais
        getSuggestions() {
            const recentTopics = Array.from(state.conversation.topics).slice(-3);
            const suggestions = [];

            if (recentTopics.includes('pcp')) {
                suggestions.push("Como criar ordem de produção?");
                suggestions.push("Gerenciar materiais");
            }

            if (recentTopics.includes('rh')) {
                suggestions.push("Registrar ponto");
                suggestions.push("Solicitar férias");
            }

            if (suggestions.length === 0) {
                suggestions.push("Ver todos os módulos");
                suggestions.push("Preciso de ajuda");
            }

            return suggestions.slice(0, 3);
        }
    }

    // Instância da IA
    const ai = new AIEngine();

    // ===== SISTEMA DE VOZ =====
    class VoiceSystem {
        constructor() {
            this.synthesis = window.speechSynthesis;
            this.recognition = null;
            this.voices = [];
            this.selectedVoice = null;
            this.isSupported = 'speechSynthesis' in window;
            this.recognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
            
            this.init();
        }

        init() {
            if (this.isSupported) {
                // Carregar vozes disponíveis
                this.loadVoices();
                this.synthesis.onvoiceschanged = () => this.loadVoices();
            }

            if (this.recognitionSupported) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.lang = CONFIG.voice.lang;
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.maxAlternatives = 1;

                this.recognition.onresult = (event) => this.handleRecognitionResult(event);
                this.recognition.onerror = (event) => this.handleRecognitionError(event);
                this.recognition.onend = () => this.handleRecognitionEnd();
            }
        }

        loadVoices() {
            this.voices = this.synthesis.getVoices();
            // Preferir voz em português brasileiro
            this.selectedVoice = this.voices.find(voice => 
                voice.lang === 'pt-BR' || voice.lang.startsWith('pt')
            ) || this.voices[0];
        }

        speak(text) {
            if (!this.isSupported || !state.ui.voiceEnabled) return;

            // Cancelar fala anterior
            this.synthesis.cancel();

            // Remover markdown e formatação
            const cleanText = text
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\n/g, ' ')
                .replace(/[✓✗📊💰🏭👥🛒📄]/g, '');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.voice = this.selectedVoice;
            utterance.rate = CONFIG.voice.rate;
            utterance.pitch = CONFIG.voice.pitch;
            utterance.volume = CONFIG.voice.volume;
            utterance.lang = CONFIG.voice.lang;

            utterance.onstart = () => {
                console.log('🔊 Speaking...');
            };

            utterance.onend = () => {
                console.log('✅ Speech finished');
            };

            utterance.onerror = (event) => {
                console.error('❌ Speech error:', event);
            };

            this.synthesis.speak(utterance);
        }

        stopSpeaking() {
            if (this.isSupported) {
                this.synthesis.cancel();
            }
        }

        startListening() {
            if (!this.recognitionSupported) {
                alert('Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.');
                return;
            }

            try {
                state.ui.isListening = true;
                updateMicButton();
                this.recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                state.ui.isListening = false;
                updateMicButton();
            }
        }

        stopListening() {
            if (this.recognition) {
                this.recognition.stop();
            }
        }

        handleRecognitionResult(event) {
            const transcript = event.results[0][0].transcript;
            console.log('🎤 Recognized:', transcript);

            // Preencher input com texto reconhecido
            if (elements.input) {
                elements.input.value = transcript;
                // Enviar automaticamente
                elements.inputForm.dispatchEvent(new Event('submit'));
            }
        }

        handleRecognitionError(event) {
            console.error('Recognition error:', event.error);
            state.ui.isListening = false;
            updateMicButton();

            if (event.error === 'no-speech') {
                showNotification('Nenhuma fala detectada. Tente novamente.', 'warning');
            } else if (event.error === 'not-allowed') {
                showNotification('Permissão de microfone negada.', 'error');
            }
        }

        handleRecognitionEnd() {
            state.ui.isListening = false;
            updateMicButton();
        }

        toggleVoice() {
            state.ui.voiceEnabled = !state.ui.voiceEnabled;
            localStorage.setItem('chatVoiceEnabled', state.ui.voiceEnabled);
            updateVoiceButton();
            
            showNotification(
                state.ui.voiceEnabled ? '🔊 Voz ativada' : '🔇 Voz desativada',
                'info'
            );
        }
    }

    // Instância do sistema de voz
    const voiceSystem = new VoiceSystem();

    function showNotification(message, type = 'info') {
        // Criar notificação visual simples
        const notification = document.createElement('div');
        notification.className = `chat-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 9999999;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function updateMicButton() {
        const micBtn = document.getElementById('micBtn');
        if (micBtn) {
            if (state.ui.isListening) {
                micBtn.classList.add('listening');
                micBtn.innerHTML = '<i class="fas fa-stop"></i>';
                micBtn.title = 'Parar gravação';
            } else {
                micBtn.classList.remove('listening');
                micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                micBtn.title = 'Gravar áudio';
            }
        }
    }

    function updateVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.innerHTML = state.ui.voiceEnabled 
                ? '<i class="fas fa-volume-up"></i>' 
                : '<i class="fas fa-volume-mute"></i>';
            voiceBtn.title = state.ui.voiceEnabled ? 'Desativar voz' : 'Ativar voz';
        }
    }

    // ===== INTERFACE VISUAL =====
    function createModernHTML() {
        const html = `
        <!-- Chat Widget Container -->
        <div class="aluforce-chat-widget" id="chatWidget">
            <!-- Header -->
            <div class="chat-header-modern">
                <div class="chat-header-left">
                    <div class="chat-avatar-container">
                        <div class="chat-avatar-img" style="background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white;">
                            <span>B</span>
                        </div>
                        <span class="chat-status-indicator"></span>
                    </div>
                    <div class="chat-header-info">
                        <div class="chat-title">Bob - Assistente IA</div>
                        <div class="chat-subtitle">
                            <span class="status-dot"></span>
                            <span>Online • Responde em segundos</span>
                        </div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-action-btn" id="chatMinimizeBtn" title="Minimizar">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="chat-action-btn" id="chatCloseBtn" title="Fechar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Messages Area -->
            <div class="chat-messages-container" id="chatMessages">
                <!-- Welcome Screen -->
                <div class="chat-welcome-screen" id="chatWelcome">
                    <div class="welcome-avatar-large" style="background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 40px; font-weight: bold; color: white;">B</span>
                    </div>
                    <h2 class="welcome-title">Olá! Eu sou o Bob 👋</h2>
                    <p class="welcome-text">Seu assistente virtual inteligente da ALUFORCE</p>
                    
                    <div class="welcome-features">
                        <div class="feature-item">
                            <i class="fas fa-robot"></i>
                            <span>IA Avançada</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-bolt"></i>
                            <span>Respostas Rápidas</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-shield-alt"></i>
                            <span>100% Seguro</span>
                        </div>
                    </div>

                    <form class="welcome-form" id="chatWelcomeForm">
                        <div class="form-group-modern">
                            <i class="fas fa-user form-icon"></i>
                            <input type="text" class="input-modern" placeholder="Seu nome" id="chatUserName" required>
                        </div>
                        <div class="form-group-modern">
                            <i class="fas fa-envelope form-icon"></i>
                            <input type="email" class="input-modern" placeholder="Seu e-mail" id="chatUserEmail" required>
                        </div>
                        <button type="submit" class="btn-start-chat">
                            <span>Iniciar Conversa</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>
                </div>

                <!-- Messages will appear here -->
            </div>

            <!-- Typing Indicator -->
            <div class="typing-indicator" id="typingIndicator" style="display: none;">
                <div class="typing-avatar" style="background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: white;">
                    <span>B</span>
                </div>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

            <!-- Quick Suggestions -->
            <div class="quick-suggestions" id="quickSuggestions" style="display: none;">
                <!-- Suggestions will be added dynamically -->
            </div>

            <!-- Input Area -->
            <div class="chat-input-container">
                <form class="chat-input-form" id="chatInputForm">
                    <button type="button" class="input-action-btn" id="voiceBtn" title="Ativar/Desativar voz">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <button type="button" class="input-action-btn" id="micBtn" title="Gravar áudio">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <input 
                        type="text" 
                        class="chat-input-modern" 
                        placeholder="Digite ou fale sua mensagem..." 
                        id="chatInput" 
                        autocomplete="off"
                        maxlength="500"
                    />
                    <button type="submit" class="chat-send-btn-modern" id="chatSendBtn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
                <div class="input-footer">
                    <span class="powered-by">🎤 Powered by ALUFORCE AI • Com suporte a voz</span>
                </div>
            </div>
        </div>

        <!-- Floating Button -->
        <button class="chat-floating-btn-modern" id="chatFloatingBtn">
            <div class="floating-icon">
                <i class="fas fa-comments"></i>
            </div>
            <span class="unread-badge" id="unreadBadge" style="display: none;">0</span>
            <div class="floating-pulse"></div>
        </button>

        <!-- Notification Sound -->
        <audio id="chatNotificationSound" preload="auto">
            <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAo=" type="audio/wav">
        </audio>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    // ===== CSS MODERNO =====
    function injectModernCSS() {
        const css = `
        <style id="chat-widget-pro-styles">
        /* Reset e Base */
        .aluforce-chat-widget *,
        .chat-floating-btn-modern * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        /* Floating Button */
        .chat-floating-btn-modern {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
            z-index: 999997;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .aluforce-chat-widget.active ~ .chat-floating-btn-modern {
            display: none;
        }

        .chat-floating-btn-modern:hover {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5);
        }

        .floating-icon {
            color: white;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .floating-pulse {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.4);
            animation: pulse 2s infinite;
            pointer-events: none;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.15);
                opacity: 0;
            }
        }

        .unread-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #ef4444;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
            border: 2px solid white;
        }

        /* Chat Widget */
        .aluforce-chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 40px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            display: none;
            flex-direction: column;
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .aluforce-chat-widget.active {
            display: flex;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Header */
        .chat-header-modern {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: white;
            flex-shrink: 0;
        }

        .chat-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }

        .chat-avatar-container {
            position: relative;
        }

        .chat-avatar-img {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            overflow: hidden;
            background: white;
            border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .chat-avatar-img img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .chat-status-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #10b981;
            border: 2px solid white;
            border-radius: 50%;
            animation: blink 2s infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .chat-header-info {
            flex: 1;
        }

        .chat-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .chat-subtitle {
            font-size: 12px;
            opacity: 0.9;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            background: #10b981;
            border-radius: 50%;
            animation: blink 2s infinite;
        }

        .chat-header-actions {
            display: flex;
            gap: 8px;
        }

        .chat-action-btn {
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

        .chat-action-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        /* Messages Container */
        .chat-messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8fafc;
            scroll-behavior: smooth;
        }

        .chat-messages-container::-webkit-scrollbar {
            width: 6px;
        }

        .chat-messages-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-messages-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }

        /* Welcome Screen */
        .chat-welcome-screen {
            text-align: center;
            padding: 40px 20px;
        }

        .welcome-avatar-large {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            border-radius: 50%;
            overflow: hidden;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .welcome-title {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }

        .welcome-text {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 24px;
        }

        .welcome-features {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 32px;
        }

        .feature-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: white;
            border-radius: 12px;
            flex: 1;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .feature-item i {
            font-size: 24px;
            color: #3b82f6;
        }

        .feature-item span {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
        }

        /* Welcome Form */
        .welcome-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .form-group-modern {
            position: relative;
        }

        .form-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 16px;
        }

        .input-modern {
            width: 100%;
            padding: 14px 16px 14px 48px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            background: white;
        }

        .input-modern:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-start-chat {
            padding: 14px 24px;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s;
            margin-top: 8px;
        }

        .btn-start-chat:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }

        /* Message Bubbles */
        .message-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        .message-bubble {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
            animation: messageSlideIn 0.3s ease-out;
        }

        @keyframes messageSlideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message-bubble.bot {
            align-self: flex-start;
            background: white;
            color: #0f172a;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .message-bubble.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            margin-left: auto;
        }

        .message-time {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
            text-align: right;
        }

        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 0 20px 12px;
            background: #f8fafc;
        }

        .typing-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            background: #94a3b8;
            border-radius: 50%;
            animation: typingDot 1.4s infinite;
        }

        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typingDot {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.4;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }

        /* Quick Suggestions */
        .quick-suggestions {
            padding: 0 20px 12px;
            background: #f8fafc;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .suggestion-btn {
            padding: 8px 16px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            font-size: 13px;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .suggestion-btn:hover {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
            transform: translateY(-1px);
        }

        /* Input Area */
        .chat-input-container {
            flex-shrink: 0;
            background: white;
            border-top: 1px solid #e2e8f0;
        }

        .chat-input-form {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
        }

        .input-action-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .input-action-btn:hover {
            background: #f1f5f9;
            color: #3b82f6;
        }

        .input-action-btn.listening {
            background: #ef4444;
            color: white;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            50% {
                box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
            }
        }

        .chat-input-modern {
            flex: 1;
            padding: 10px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            background: #f8fafc;
        }

        .chat-input-modern:focus {
            outline: none;
            border-color: #3b82f6;
            background: white;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .chat-send-btn-modern {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            font-size: 14px;
        }

        .chat-send-btn-modern:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .chat-send-btn-modern:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .input-footer {
            padding: 8px 16px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
        }

        .powered-by {
            font-size: 11px;
            color: #94a3b8;
        }

        /* Responsivo */
        @media (max-width: 480px) {
            .aluforce-chat-widget {
                width: calc(100vw - 16px);
                height: calc(100vh - 16px);
                bottom: 8px;
                right: 8px;
                border-radius: 12px;
            }

            .chat-floating-btn-modern {
                bottom: 16px;
                right: 16px;
                width: 52px;
                height: 52px;
            }

            .floating-icon {
                font-size: 22px;
            }
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .aluforce-chat-widget {
                background: #1e293b;
            }

            .chat-messages-container {
                background: #0f172a;
            }

            .message-bubble.bot {
                background: #1e293b;
                color: #f1f5f9;
            }

            .input-modern,
            .chat-input-modern {
                background: #1e293b;
                color: #f1f5f9;
                border-color: #334155;
            }

            .welcome-title {
                color: #f1f5f9;
            }

            .welcome-text,
            .feature-item span {
                color: #94a3b8;
            }

            .feature-item {
                background: #1e293b;
            }
        }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', css);
    }

    // ===== FUNCIONALIDADES =====
    let elements = {};

    function cacheElements() {
        elements = {
            widget: document.getElementById('chatWidget'),
            floatingBtn: document.getElementById('chatFloatingBtn'),
            closeBtn: document.getElementById('chatCloseBtn'),
            minimizeBtn: document.getElementById('chatMinimizeBtn'),
            welcome: document.getElementById('chatWelcome'),
            messages: document.getElementById('chatMessages'),
            welcomeForm: document.getElementById('chatWelcomeForm'),
            inputForm: document.getElementById('chatInputForm'),
            input: document.getElementById('chatInput'),
            sendBtn: document.getElementById('chatSendBtn'),
            typingIndicator: document.getElementById('typingIndicator'),
            suggestions: document.getElementById('quickSuggestions'),
            unreadBadge: document.getElementById('unreadBadge'),
            notification: document.getElementById('chatNotificationSound')
        };
    }

    function attachEvents() {
        // Toggle chat
        elements.floatingBtn.addEventListener('click', openChat);
        elements.closeBtn.addEventListener('click', closeChat);
        elements.minimizeBtn.addEventListener('click', closeChat);

        // Welcome form
        elements.welcomeForm.addEventListener('submit', handleWelcomeSubmit);

        // Message form
        elements.inputForm.addEventListener('submit', handleMessageSubmit);

        // Voice controls
        const voiceBtn = document.getElementById('voiceBtn');
        const micBtn = document.getElementById('micBtn');
        
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => voiceSystem.toggleVoice());
        }
        
        if (micBtn) {
            micBtn.addEventListener('click', () => {
                if (state.ui.isListening) {
                    voiceSystem.stopListening();
                } else {
                    voiceSystem.startListening();
                }
            });
        }

        // Input focus
        elements.input.addEventListener('focus', () => {
            state.ui.unreadCount = 0;
            updateUnreadBadge();
        });
    }

    function openChat() {
        elements.widget.classList.add('active');
        state.ui.isOpen = true;
        state.ui.unreadCount = 0;
        updateUnreadBadge();
        
        if (state.user.name) {
            elements.input.focus();
        }
    }

    function closeChat() {
        elements.widget.classList.remove('active');
        state.ui.isOpen = false;
    }

    function handleWelcomeSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('chatUserName').value.trim();
        const email = document.getElementById('chatUserEmail').value.trim();

        if (name && email) {
            state.user.name = name;
            state.user.email = email;
            state.user.id = `user_${Date.now()}`;
            state.user.sessionId = generateSessionId();

            // Salvar no localStorage
            localStorage.setItem('chatUser', JSON.stringify(state.user));

            // Esconder welcome
            elements.welcome.style.display = 'none';

            // Mensagem de boas-vindas
            addBotMessage(`Olá, ${name}! 👋 É um prazer conhecê-lo(a)!\n\nSou o Bob, seu assistente virtual inteligente da ALUFORCE. Posso ajudá-lo com informações sobre nossos módulos, tirar dúvidas e orientá-lo no sistema.\n\nSobre o que você gostaria de saber?`);

            // Mostrar sugestões
            updateSuggestions();

            // Focar input
            elements.input.focus();
        }
    }

    function handleMessageSubmit(e) {
        e.preventDefault();
        
        const message = elements.input.value.trim();
        if (!message) return;

        // Adicionar mensagem do usuário
        addUserMessage(message);

        // Limpar input
        elements.input.value = '';

        // Processar com IA
        processMessageWithAI(message);
    }

    function addUserMessage(text) {
        const messageHTML = `
            <div class="message-group">
                <div class="message-bubble user">
                    ${escapeHTML(text)}
                    <div class="message-time">${getCurrentTime()}</div>
                </div>
            </div>
        `;

        elements.messages.insertAdjacentHTML('beforeend', messageHTML);
        scrollToBottom();

        // Salvar no histórico
        state.conversation.messages.push({
            type: 'user',
            text: text,
            time: Date.now()
        });
    }

    function addBotMessage(text) {
        showTypingIndicator();

        setTimeout(() => {
            hideTypingIndicator();

            const messageHTML = `
                <div class="message-group">
                    <div class="message-bubble bot">
                        ${formatBotMessage(text)}
                        <div class="message-time">${getCurrentTime()}</div>
                    </div>
                </div>
            `;

            elements.messages.insertAdjacentHTML('beforeend', messageHTML);
            scrollToBottom();

            // Salvar no histórico
            state.conversation.messages.push({
                type: 'bot',
                text: text,
                time: Date.now()
            });

            // Falar mensagem em voz alta
            if (state.ui.voiceEnabled) {
                voiceSystem.speak(text);
            }

            // Notificação se chat fechado
            if (!state.ui.isOpen) {
                state.ui.unreadCount++;
                updateUnreadBadge();
                playNotification();
            }

            // Atualizar sugestões
            updateSuggestions();
        }, CONFIG.typingDelay);
    }

    function processMessageWithAI(message) {
        const result = ai.analyze(message);
        addBotMessage(result.response);
    }

    function formatBotMessage(text) {
        // Converter markdown básico
        let formatted = escapeHTML(text);
        
        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Quebras de linha
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Emojis (manter como estão)
        
        return formatted;
    }

    function showTypingIndicator() {
        elements.typingIndicator.style.display = 'flex';
        scrollToBottom();
    }

    function hideTypingIndicator() {
        elements.typingIndicator.style.display = 'none';
    }

    function updateSuggestions() {
        const suggestions = ai.getSuggestions();
        
        if (suggestions.length > 0) {
            const html = suggestions.map(s => 
                `<button class="suggestion-btn" onclick="window.chatHandleSuggestion('${s}')">${s}</button>`
            ).join('');
            
            elements.suggestions.innerHTML = html;
            elements.suggestions.style.display = 'flex';
        } else {
            elements.suggestions.style.display = 'none';
        }
    }

    window.chatHandleSuggestion = function(suggestion) {
        elements.input.value = suggestion;
        elements.inputForm.dispatchEvent(new Event('submit'));
    };

    function updateUnreadBadge() {
        if (state.ui.unreadCount > 0) {
            elements.unreadBadge.textContent = state.ui.unreadCount;
            elements.unreadBadge.style.display = 'block';
        } else {
            elements.unreadBadge.style.display = 'none';
        }
    }

    function playNotification() {
        try {
            elements.notification.play();
        } catch (e) {
            console.log('Notification sound not available');
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            elements.messages.scrollTop = elements.messages.scrollHeight;
        }, 100);
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function loadUserData() {
        const saved = localStorage.getItem('chatUser');
        if (saved) {
            try {
                const user = JSON.parse(saved);
                state.user = user;
                elements.welcome.style.display = 'none';
                addBotMessage(`Bem-vindo de volta, ${user.name}! 😊\n\nComo posso ajudá-lo hoje?`);
                updateSuggestions();
            } catch (e) {
                console.log('Could not load user data');
            }
        }

        // Carregar preferência de voz
        const voiceEnabled = localStorage.getItem('chatVoiceEnabled');
        if (voiceEnabled !== null) {
            state.ui.voiceEnabled = voiceEnabled === 'true';
            updateVoiceButton();
        }
    }

    // ===== INICIALIZAÇÉO =====
    function initialize() {
        injectModernCSS();
        createModernHTML();
        cacheElements();
        attachEvents();
        loadUserData();

        console.log('%c✨ ALUFORCE Chat Widget Pro Initialized!', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
