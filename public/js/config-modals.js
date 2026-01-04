/**
 * ============================================================
 * CONFIGURAÇÕES DO SISTEMA - JAVASCRIPT
 * Gerenciamento de todos os modais de configuração
 * ============================================================
 */

// =========================
// VARIÁVEIS GLOBAIS
// =========================
let configModalsLoaded = false;

// =========================
// FUNÇÕES PRINCIPAIS
// =========================

/**
 * Abre a configuração específica
 */
async function abrirConfiguracao(tipo) {
    console.log('Abrindo configuração:', tipo);
    
    // Mapeamento de tipos para IDs de modal
    const modalMap = {
        'empresa': 'modal-daçãos-empresa',
        'categorias': 'modal-categorias',
        'departamentos': 'modal-departamentos',
        'projetos': 'modal-projetos',
        'certificação-digital': 'modal-certificação',
        'importacao-nfe': 'modal-nfe-import',
        'funcionarios': 'modal-funcionarios',
        'cargos': 'modal-cargos',
        'folha-pagamento': 'modal-folha-pagamento',
        'ponto-eletronico': 'modal-ponto-eletronico',
        'plano-contas': 'modal-plano-contas',
        'contas-bancarias': 'modal-contas-bancarias',
        'formas-pagamento': 'modal-formas-pagamento',
        'impostos': 'modal-impostos',
        'grupos-clientes': 'modal-grupos-clientes',
        'regioes-venda': 'modal-regioes-venda',
        'tipos-fornecedor': 'modal-tipos-fornecedor',
        'condicoes-pagamento': 'modal-condicoes-pagamento',
        'familias-produtos': 'modal-familias-produtos',
        'tabelas-preco': 'modal-tabelas-preco',
        'unidades-medida': 'modal-unidades-medida',
        'venda-produtos': 'modal-venda-produtos',
        'venda-servicos': 'modal-venda-servicos',
        'clientes-fornecedores': 'modal-clientes-fornecedores-config',
        'financas': 'modal-financas',
        'caracteristicas-produtos': 'modal-caracteristicas-produtos',
        'vendedores': 'modal-vendedores',
        'compraçãores': 'modal-compraçãores',
        'ncm': 'modal-ncm',
        'tipos-servico': 'modal-tipos-servico',
        'contratos': 'modal-contratos',
        'sla': 'modal-sla',
        'nfse': 'modal-nfse'
    };

    const modalId = modalMap[tipo];
    
    if (!modalId) {
        console.error('Tipo de configuração não encontrado:', tipo);
        if (typeof showNotification === 'function') {
            showNotification('Configuração não encontrada', 'error');
        } else {
            alert('Configuração não encontrada: ' + tipo);
        }
        return;
    }

    // Verifica se o modal existe - tenta aguardar carregamento
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        console.warn('Modal não encontrado imediatamente, aguardando carregamento:', modalId);
        // Aguardar um pouco para os modais carregarem via fetch
        await new Promise(resolve => setTimeout(resolve, 500));
        modal = document.getElementById(modalId);
    }
    
    if (!modal) {
        console.error('Modal não encontrado após aguardar:', modalId);
        if (typeof showNotification === 'function') {
            showNotification('Modal de configuração não encontrado. Tente novamente.', 'error');
        } else {
            alert('Modal não encontrado: ' + modalId);
        }
        return;
    }

    // Abre o modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Carrega daçãos específicos para cada tipo
    switch(tipo) {
        case 'empresa':
            loadEmpresaData();
            break;
        case 'categorias':
            loadCategoriasData();
            break;
        case 'departamentos':
            loadDepartamentosData();
            break;
        case 'projetos':
            loadProjetosData();
            break;
        case 'certificação-digital':
            loadCertificaçãoData();
            break;
        case 'importacao-nfe':
            loadNfeImportData();
            break;
        case 'funcionarios':
            loadFuncionariosData();
            break;
        case 'cargos':
            loadCargosData();
            break;
        case 'folha-pagamento':
            loadFolhaPagamentoData();
            break;
        case 'ponto-eletronico':
            loadPontoEletronicoData();
            break;
        case 'plano-contas':
            loadPlanoContasData();
            break;
        case 'contas-bancarias':
            loadContasBancariasData();
            break;
        case 'formas-pagamento':
            loadFormasPagamentoData();
            break;
        case 'impostos':
            loadImpostosData();
            break;
        case 'grupos-clientes':
            loadGruposClientesData();
            break;
        case 'regioes-venda':
            loadRegioesVendaData();
            break;
        case 'tipos-fornecedor':
            loadTiposFornecedorData();
            break;
        case 'condicoes-pagamento':
            loadCondicoesPagamentoData();
            break;
        case 'tabelas-preco':
            loadTabelasPrecoData();
            break;
        case 'unidades-medida':
            loadUnidadesMedidaData();
            break;
        case 'vendedores':
            loadVendedoresData();
            break;
        case 'compraçãores':
            loadCompraçãoresData();
            break;
        case 'ncm':
            loadNCMData();
            break;
        case 'tipos-servico':
            loadTiposServicoData();
            break;
        case 'contratos':
            loadContratosData();
            break;
        case 'sla':
            loadSLAData();
            break;
        case 'nfse':
            loadNFSeData();
            break;
    }
}

/**
 * Fecha um modal de configuração específico
 */
function closeConfigModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Fecha todos os modais de configuração
 */
function closeAllConfigModals() {
    const modals = document.querySelectorAll('.config-detail-modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// =========================
// DADOS DA EMPRESA
// =========================

/**
 * Carrega daçãos da empresa
 */
async function loadEmpresaData() {
    try {
        const response = await fetch('/api/configuracoes/empresa');
        if (response.ok) {
            const data = await response.json();
            populateEmpresaForm(data);
        }
    } catch (error) {
        console.error('Erro ao carregar daçãos da empresa:', error);
    }
}

/**
 * Preenche o formulário de daçãos da empresa
 */
function populateEmpresaForm(data) {
    const form = document.getElementById('form-daçãos-empresa');
    if (!form || !data) return;

    // Preenche os campos do formulário
    const fields = ['razao_social', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 
                   'inscricao_municipal', 'telefone', 'email', 'site', 'cep', 
                   'estação', 'cidade', 'bairro', 'endereco', 'número', 'complemento'];
    
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input && data[field]) {
            input.value = data[field];
        }
    });
}

/**
 * Salva configurações da empresa (incluindo logo e favicon)
 */
async function saveEmpresaConfig() {
    const form = document.getElementById('form-daçãos-empresa');
    if (!form) return;

    // Valida campos obrigatórios
    const razaoSocial = form.querySelector('[name="razao_social"]').value.trim();
    if (!razaoSocial) {
        showNotification('Razão Social é obrigatória', 'error');
        return;
    }

    // Coleta daçãos do formulário
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        // Primeiro salva os daçãos básicos
        const response = await fetch('/api/configuracoes/empresa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar daçãos');
        }

        // Upload do logo se foi selecionação
        const logoInput = document.getElementById('input-logo');
        if (logoInput && logoInput.files[0]) {
            const logoFormData = new FormData();
            logoFormData.append('logo', logoInput.files[0]);
            
            const logoResponse = await fetch('/api/configuracoes/upload-logo', {
                method: 'POST',
                body: logoFormData
            });
            
            if (logoResponse.ok) {
                const result = await logoResponse.json();
                // Atualizar logo em todo o sistema imediatamente
                atualizarLogoSistema(result.url);
            }
        }

        // Upload do favicon se foi selecionação
        const faviconInput = document.getElementById('input-favicon');
        if (faviconInput && faviconInput.files[0]) {
            const faviconFormData = new FormData();
            faviconFormData.append('favicon', faviconInput.files[0]);
            
            const faviconResponse = await fetch('/api/configuracoes/upload-favicon', {
                method: 'POST',
                body: faviconFormData
            });
            
            if (faviconResponse.ok) {
                const result = await faviconResponse.json();
                // Atualizar favicon em todo o sistema imediatamente
                atualizarFaviconSistema(result.url);
            }
        }

        showNotification('Daçãos da empresa salvos com sucesso!', 'success');
        
        // Registrar na central de notificações
        if (window.registrarAcao) {
            window.registrarAcao('salvar', 'configuracoes', 'Daçãos da Empresa');
        }
        
        closeConfigModal('modal-daçãos-empresa');
    } catch (error) {
        console.error('Erro ao salvar daçãos da empresa:', error);
        showNotification('Erro ao salvar daçãos da empresa', 'error');
    }
}

/**
 * Atualiza o logo em todo o sistema após upload
 */
function atualizarLogoSistema(logoUrl) {
    // Adicionar timestamp para evitar cache
    const urlComTimestamp = logoUrl + 'v=' + Date.now();
    
    // Atualizar todos os elementos com classe logo ou id relacionaçãos
    document.querySelectorAll('.logo-empresa, .company-logo, #logo-sidebar, #logo-header, img[src*="logo"]').forEach(img => {
        if (img.tagName === 'IMG') {
            img.src = urlComTimestamp;
        } else if (img.style) {
            img.style.backgroundImage = `url('${urlComTimestamp}')`;
        }
    });
    
    // Salvar no localStorage para persistir entre recarregamentos
    localStorage.setItem('empresa_logo_url', logoUrl);
    localStorage.setItem('empresa_logo_timestamp', Date.now().toString());
    
    console.log('[Logo] Atualização em todo o sistema:', logoUrl);
}

/**
 * Atualiza o favicon em todo o sistema após upload
 */
function atualizarFaviconSistema(faviconUrl) {
    // Adicionar timestamp para evitar cache
    const urlComTimestamp = faviconUrl + 'v=' + Date.now();
    
    // Remover favicons existentes
    document.querySelectorAll('link[rel*="icon"]').forEach(link => link.remove());
    
    // Criar novos elementos de favicon
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/x-icon';
    favicon.href = urlComTimestamp;
    document.head.appendChild(favicon);
    
    const faviconApple = document.createElement('link');
    faviconApple.rel = 'apple-touch-icon';
    faviconApple.href = urlComTimestamp;
    document.head.appendChild(faviconApple);
    
    // Salvar no localStorage para persistir entre recarregamentos
    localStorage.setItem('empresa_favicon_url', faviconUrl);
    localStorage.setItem('empresa_favicon_timestamp', Date.now().toString());
    
    console.log('[Favicon] Atualização em todo o sistema:', faviconUrl);
}

// =========================
// CONFIGURAÇÕES ESTENDIDAS
// =========================

/**
 * Salva configurações de venda de produtos
 */
async function saveVendaProdutosConfig() {
    const form = document.getElementById('form-venda-produtos');
    const config = {
        etapas: {
            orcamento: form.querySelector('[name="etapa_orcamento"]').checked || false,
            pedido_aprovação: form.querySelector('[name="etapa_pedido_aprovação"]').checked || false,
            analise_credito: form.querySelector('[name="etapa_analise_credito"]').checked || false,
            faturar: form.querySelector('[name="etapa_faturar"]').checked || false,
            faturado: form.querySelector('[name="etapa_faturado"]').checked || false,
            entregue: form.querySelector('[name="etapa_entregue"]').checked || false
        },
        tabelas_preco: {
            nao_alterar_preco: document.getElementById('bloquear-preco-tabela').checked || false,
            permitir_orcamento: document.getElementById('permitir-orçamento').checked || false
        },
        numeracao: {
            próximo_pedido: form.querySelector('[name="próximo_numero_pedido"]').value || '1001',
            próxima_remessa: form.querySelector('[name="próxima_remessa"]').value || '5001'
        },
        reserva_estoque: {
            reservar_ao_aprovar: document.getElementById('reservar-aprovar').checked || false,
            reservar_ao_faturar: document.getElementById('reservar-faturar').checked || false
        }
    };

    try {
        const response = await fetch('/api/configuracoes/venda-produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configurações de venda de produtos salvas!', 'success');
            fecharModal('modal-venda-produtos');
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao salvar configurações', 'error');
    }
}

/**
 * Salva configurações de venda de serviços
 */
async function saveVendaServicosConfig() {
    const config = {
        etapas: {
            ordem_servico: document.getElementById('etapa-ordem-servico').checked || false,
            em_execucao: document.getElementById('etapa-em-execucao').checked || false,
            executada: document.getElementById('etapa-executada').checked || false,
            faturar_servico: document.getElementById('etapa-faturar-servico').checked || false
        },
        proposta: {
            permitir_proposta: document.getElementById('permitir-proposta').checked || false
        },
        numeracao: {
            próximo_os: document.getElementById('próximo-os').value || '1001'
        }
    };

    try {
        const response = await fetch('/api/configuracoes/venda-servicos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configurações de venda de serviços salvas!', 'success');
            fecharModal('modal-venda-servicos');
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao salvar configurações', 'error');
    }
}

/**
 * Salva configurações de clientes e fornecedores
 */
async function saveClientesFornecedoresConfig() {
    const config = {
        validacoes: {
            obrigar_cnpj_cpf: document.getElementById('obrigar-cnpj-cpf').checked || false,
            obrigar_endereco: document.getElementById('obrigar-endereco').checked || false,
            obrigar_email: document.getElementById('obrigar-email').checked || false,
            validar_unicidade: document.getElementById('validar-unicidade').checked || false
        },
        credito: {
            bloquear_novos: document.getElementById('bloquear-novos').checked || false,
            limite_padrao: document.getElementById('limite-credito-padrao').value || '0'
        },
        tags: {
            tags_automaticas: document.getElementById('tags-automaticas').checked || false
        }
    };

    try {
        const response = await fetch('/api/configuracoes/clientes-fornecedores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configurações de clientes/fornecedores salvas!', 'success');
            fecharModal('modal-clientes-fornecedores-config');
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao salvar configurações', 'error');
    }
}

/**
 * Salva configurações de finanças
 */
async function saveFinanceConfig() {
    const config = {
        contas_atraso: document.getElementById('contas-atraso').value || 'nao-mostrar',
        email_remessa: document.getElementById('email-remessa').value || '',
        juros_mes: document.getElementById('juros-mes').value || '1.0',
        multa_atraso: document.getElementById('multa-atraso').value || '2.0'
    };

    try {
        const response = await fetch('/api/configuracoes/financas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configurações de finanças salvas!', 'success');
            fecharModal('modal-financas');
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao salvar configurações', 'error');
    }
}

// =========================
// CATEGORIAS
// =========================

/**
 * Carrega lista de categorias
 */
async function loadCategoriasData() {
    try {
        const response = await fetch('/api/configuracoes/categorias');
        if (response.ok) {
            const categorias = await response.json();
            displayCategorias(categorias);
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

/**
 * Exibe lista de categorias
 */
function displayCategorias(categorias) {
    const list = document.getElementById('categorias-list');
    const empty = document.getElementById('categorias-empty');
    
    if (!list) return;

    if (!categorias || categorias.length === 0) {
        list.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        return;
    }

    list.style.display = 'block';
    if (empty) empty.style.display = 'none';

    // Cores para categorias
    const cores = ['#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

    list.innerHTML = categorias.map((cat, index) => {
        const cor = cat.cor || cores[index % cores.length];
        return `
        <div class="config-item-premium" style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%); border-radius: 14px; margin-bottom: 12px; border: 1px solid #e5e7eb; transition: all 0.3s ease; position: relative; overflow: hidden;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShaçãow='0 8px 25px rgba(0,0,0,0.08)'; this.style.borderColor='${cor}40';" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShaçãow='none'; this.style.borderColor='#e5e7eb';">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${cor};"></div>
            <div style="width: 46px; height: 46px; background: linear-gradient(135deg, ${cor}15, ${cor}25); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas fa-folder" style="font-size: 20px; color: ${cor};"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1f2937;">${cat.nome}</h4>
                <p style="margin: 0; font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.descricao || cat.descricao || 'Sem descricao'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="editarCategoria(${cat.id})" title="Editar" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(59, 130, 246, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-pen" style="font-size: 14px;"></i>
                </button>
                <button onclick="excluirCategoria(${cat.id})" title="Excluir" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(239, 68, 68, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-trash-alt" style="font-size: 14px;"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Mostra formulário para nova categoria
 */
function showNovaCategoriaForm() {
    // Limpar campos
    document.getElementById('categoria-id').value = '';
    document.getElementById('categoria-nome').value = '';
    document.getElementById('categoria-descricao').value = '';
    document.getElementById('categoria-cor').value = '#6366f1';
    
    // Atualizar título
    document.getElementById('categoria-form-title').textContent = 'Nova Categoria';
    
    // Abrir modal
    const modal = document.getElementById('modal-categoria-form');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Edita uma categoria
 */
async function editarCategoria(id) {
    try {
        // Buscar daçãos da categoria
        const response = await fetch(`/api/configuracoes/categorias/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar categoria');
        
        const categoria = await response.json();
        
        // Preencher campos
        document.getElementById('categoria-id').value = categoria.id;
        document.getElementById('categoria-nome').value = categoria.nome || '';
        document.getElementById('categoria-descricao').value = categoria.descricao || '';
        document.getElementById('categoria-cor').value = categoria.cor || '#6366f1';
        
        // Atualizar título
        document.getElementById('categoria-form-title').textContent = 'Editar Categoria';
        
        // Abrir modal
        const modal = document.getElementById('modal-categoria-form');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Erro ao carregar categoria:', error);
        showNotification('Erro ao carregar daçãos da categoria', 'error');
    }
}

/**
 * Salva uma categoria (nova ou editada)
 */
async function salvarCategoria() {
    const id = document.getElementById('categoria-id').value;
    const nome = document.getElementById('categoria-nome').value.trim();
    const descricao = document.getElementById('categoria-descricao').value.trim();
    const cor = document.getElementById('categoria-cor').value;
    
    if (!nome) {
        showNotification('O nome da categoria é obrigatório', 'error');
        return;
    }
    
    try {
        const url = id  `/api/configuracoes/categorias/${id}` : '/api/configuracoes/categorias';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, cor })
        });
        
        if (response.ok) {
            showNotification(id ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!', 'success');
            closeConfigModal('modal-categoria-form');
            loadCategoriasData(); // Recarregar lista
        } else {
            throw new Error('Erro ao salvar categoria');
        }
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        showNotification('Erro ao salvar categoria', 'error');
    }
}

/**
 * Exclui uma categoria
 */
async function excluirCategoria(id) {
    if (!confirm('Deseja realmente excluir está categoria')) return;

    try {
        const response = await fetch(`/api/configuracoes/categorias/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Categoria excluída com sucesso!', 'success');
            loadCategoriasData();
        } else {
            throw new Error('Erro ao excluir categoria');
        }
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        showNotification('Erro ao excluir categoria', 'error');
    }
}

// =========================
// DEPARTAMENTOS
// =========================

/**
 * Carrega lista de departamentos
 */
async function loadDepartamentosData() {
    try {
        const response = await fetch('/api/configuracoes/departamentos');
        if (response.ok) {
            const departamentos = await response.json();
            displayDepartamentos(departamentos);
        }
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
    }
}

/**
 * Exibe lista de departamentos
 */
function displayDepartamentos(departamentos) {
    const list = document.getElementById('departamentos-list');
    const empty = document.getElementById('departamentos-empty');
    
    if (!list) return;

    if (!departamentos || departamentos.length === 0) {
        list.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        return;
    }

    list.style.display = 'block';
    if (empty) empty.style.display = 'none';

    // Cores para departamentos
    const cores = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

    list.innerHTML = departamentos.map((dept, index) => {
        const cor = cores[index % cores.length];
        return `
        <div class="config-item-premium" style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%); border-radius: 14px; margin-bottom: 12px; border: 1px solid #e5e7eb; transition: all 0.3s ease; position: relative; overflow: hidden;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShaçãow='0 8px 25px rgba(0,0,0,0.08)'; this.style.borderColor='${cor}40';" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShaçãow='none'; this.style.borderColor='#e5e7eb';">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${cor};"></div>
            <div style="width: 46px; height: 46px; background: linear-gradient(135deg, ${cor}15, ${cor}25); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas fa-building" style="font-size: 20px; color: ${cor};"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1f2937;">${dept.nome}</h4>
                <p style="margin: 0; font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dept.descricao || dept.descricao || 'Sem descricao'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="editarDepartamento(${dept.id})" title="Editar" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(59, 130, 246, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-pen" style="font-size: 14px;"></i>
                </button>
                <button onclick="excluirDepartamento(${dept.id})" title="Excluir" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(239, 68, 68, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-trash-alt" style="font-size: 14px;"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Mostra formulário para novo departamento
 */
function showNovoDepartamentoForm() {
    // Limpar campos
    document.getElementById('departamento-id').value = '';
    document.getElementById('departamento-nome').value = '';
    document.getElementById('departamento-descricao').value = '';
    document.getElementById('departamento-responsavel').value = '';
    
    // Atualizar título
    document.getElementById('departamento-form-title').textContent = 'Novo Departamento';
    
    // Abrir modal
    const modal = document.getElementById('modal-departamento-form');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Edita um departamento
 */
async function editarDepartamento(id) {
    try {
        // Buscar daçãos do departamento
        const response = await fetch(`/api/configuracoes/departamentos/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar departamento');
        
        const departamento = await response.json();
        
        // Preencher campos
        document.getElementById('departamento-id').value = departamento.id;
        document.getElementById('departamento-nome').value = departamento.nome || '';
        document.getElementById('departamento-descricao').value = departamento.descricao || departamento.descricao || '';
        document.getElementById('departamento-responsavel').value = departamento.responsavel || '';
        
        // Atualizar título
        document.getElementById('departamento-form-title').textContent = 'Editar Departamento';
        
        // Abrir modal
        const modal = document.getElementById('modal-departamento-form');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Erro ao carregar departamento:', error);
        showNotification('Erro ao carregar daçãos do departamento', 'error');
    }
}

/**
 * Salva um departamento (novo ou editação)
 */
async function salvarDepartamento() {
    const id = document.getElementById('departamento-id').value;
    const nome = document.getElementById('departamento-nome').value.trim();
    const descricao = document.getElementById('departamento-descricao').value.trim();
    const responsavel = document.getElementById('departamento-responsavel').value.trim();
    
    if (!nome) {
        showNotification('O nome do departamento é obrigatório', 'error');
        return;
    }
    
    try {
        const url = id  `/api/configuracoes/departamentos/${id}` : '/api/configuracoes/departamentos';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, responsavel })
        });
        
        if (response.ok) {
            showNotification(id ? 'Departamento atualização com sucesso!' : 'Departamento criado com sucesso!', 'success');
            closeConfigModal('modal-departamento-form');
            loadDepartamentosData(); // Recarregar lista
        } else {
            throw new Error('Erro ao salvar departamento');
        }
    } catch (error) {
        console.error('Erro ao salvar departamento:', error);
        showNotification('Erro ao salvar departamento', 'error');
    }
}

/**
 * Exclui um departamento
 */
async function excluirDepartamento(id) {
    if (!confirm('Deseja realmente excluir este departamento')) return;

    try {
        const response = await fetch(`/api/configuracoes/departamentos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Departamento excluído com sucesso!', 'success');
            loadDepartamentosData();
        } else {
            throw new Error('Erro ao excluir departamento');
        }
    } catch (error) {
        console.error('Erro ao excluir departamento:', error);
        showNotification('Erro ao excluir departamento', 'error');
    }
}

// =========================
// PROJETOS
// =========================

/**
 * Carrega lista de projetos
 */
async function loadProjetosData() {
    try {
        const response = await fetch('/api/configuracoes/projetos');
        if (response.ok) {
            const projetos = await response.json();
            displayProjetos(projetos);
        }
    } catch (error) {
        console.error('Erro ao carregar projetos:', error);
    }
}

/**
 * Exibe lista de projetos
 */
function displayProjetos(projetos) {
    const list = document.getElementById('projetos-list');
    const empty = document.getElementById('projetos-empty');
    
    if (!list) return;

    if (!projetos || projetos.length === 0) {
        list.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        return;
    }

    list.style.display = 'block';
    if (empty) empty.style.display = 'none';

    list.innerHTML = projetos.map((proj) => {
        // Cor baseada no status
        const statusCores = {
            'ativo': '#8b5cf6',
            'em_andamento': '#3b82f6',
            'pausação': '#f59e0b',
            'concluido': '#10b981',
            'cancelação': '#ef4444'
        };
        const cor = statusCores[proj.status] || '#8b5cf6';
        const statusTexto = {
            'ativo': 'Ativo',
            'em_andamento': 'Em Andamento',
            'pausação': 'Pausação',
            'concluido': 'Concluído',
            'cancelação': 'Cancelação'
        };
        return `
        <div class="config-item-premium" style="display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%); border-radius: 14px; margin-bottom: 12px; border: 1px solid #e5e7eb; transition: all 0.3s ease; position: relative; overflow: hidden;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShaçãow='0 8px 25px rgba(0,0,0,0.08)'; this.style.borderColor='${cor}40';" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShaçãow='none'; this.style.borderColor='#e5e7eb';">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${cor};"></div>
            <div style="width: 46px; height: 46px; background: linear-gradient(135deg, ${cor}15, ${cor}25); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas fa-rocket" style="font-size: 20px; color: ${cor};"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">${proj.nome}</h4>
                    <span style="padding: 3px 10px; background: ${cor}20; color: ${cor}; border-radius: 20px; font-size: 11px; font-weight: 600;">${statusTexto[proj.status] || 'Ativo'}</span>
                </div>
                <p style="margin: 0; font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${proj.descricao || proj.descricao || 'Sem descricao'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="editarProjeto(${proj.id})" title="Editar" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(59, 130, 246, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-pen" style="font-size: 14px;"></i>
                </button>
                <button onclick="excluirProjeto(${proj.id})" title="Excluir" style="width: 38px; height: 38px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shaçãow: 0 2px 8px rgba(239, 68, 68, 0.3);" onmouseenter="this.style.transform='scale(1.08)';" onmouseleave="this.style.transform='scale(1)';">
                    <i class="fas fa-trash-alt" style="font-size: 14px;"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Mostra formulário para novo projeto
 */
function showNovoProjetoForm() {
    // Limpar campos
    document.getElementById('projeto-id').value = '';
    document.getElementById('projeto-nome').value = '';
    document.getElementById('projeto-descricao').value = '';
    document.getElementById('projeto-data-inicio').value = '';
    document.getElementById('projeto-data-fim').value = '';
    document.getElementById('projeto-status').value = 'ativo';
    
    // Atualizar título
    document.getElementById('projeto-form-title').textContent = 'Novo Projeto';
    
    // Abrir modal
    const modal = document.getElementById('modal-projeto-form');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Edita um projeto
 */
async function editarProjeto(id) {
    try {
        // Buscar daçãos do projeto
        const response = await fetch(`/api/configuracoes/projetos/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar projeto');
        
        const projeto = await response.json();
        
        // Preencher campos
        document.getElementById('projeto-id').value = projeto.id;
        document.getElementById('projeto-nome').value = projeto.nome || '';
        document.getElementById('projeto-descricao').value = projeto.descricao || projeto.descricao || '';
        document.getElementById('projeto-data-inicio').value = projeto.data_inicio ? projeto.data_inicio.split('T')[0] : '';
        document.getElementById('projeto-data-fim').value = projeto.data_fim ? projeto.data_fim.split('T')[0] : '';
        document.getElementById('projeto-status').value = projeto.status || 'ativo';
        
        // Atualizar título
        document.getElementById('projeto-form-title').textContent = 'Editar Projeto';
        
        // Abrir modal
        const modal = document.getElementById('modal-projeto-form');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        showNotification('Erro ao carregar daçãos do projeto', 'error');
    }
}

/**
 * Salva um projeto (novo ou editação)
 */
async function salvarProjeto() {
    const id = document.getElementById('projeto-id').value;
    const nome = document.getElementById('projeto-nome').value.trim();
    const descricao = document.getElementById('projeto-descricao').value.trim();
    const data_inicio = document.getElementById('projeto-data-inicio').value;
    const data_fim = document.getElementById('projeto-data-fim').value;
    const status = document.getElementById('projeto-status').value;
    
    if (!nome) {
        showNotification('O nome do projeto é obrigatório', 'error');
        return;
    }
    
    try {
        const url = id  `/api/configuracoes/projetos/${id}` : '/api/configuracoes/projetos';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, descricao, data_inicio, data_fim, status })
        });
        
        if (response.ok) {
            showNotification(id ? 'Projeto atualização com sucesso!' : 'Projeto criado com sucesso!', 'success');
            closeConfigModal('modal-projeto-form');
            loadProjetosData(); // Recarregar lista
        } else {
            throw new Error('Erro ao salvar projeto');
        }
    } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        showNotification('Erro ao salvar projeto', 'error');
    }
}

/**
 * Exclui um projeto
 */
async function excluirProjeto(id) {
    if (!confirm('Deseja realmente excluir este projeto')) return;

    try {
        const response = await fetch(`/api/configuracoes/projetos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Projeto excluído com sucesso!', 'success');
            loadProjetosData();
        } else {
            throw new Error('Erro ao excluir projeto');
        }
    } catch (error) {
        console.error('Erro ao excluir projeto:', error);
        showNotification('Erro ao excluir projeto', 'error');
    }
}

// =========================
// CERTIFICADO DIGITAL
// =========================

/**
 * Carrega daçãos do certificação
 */
async function loadCertificaçãoData() {
    try {
        const response = await fetch('/api/configuracoes/certificação');
        if (response.ok) {
            const data = await response.json();
            displayCertificaçãoInfo(data);
        }
    } catch (error) {
        console.error('Erro ao carregar certificação:', error);
    }
}

/**
 * Exibe informações do certificação
 */
function displayCertificaçãoInfo(data) {
    if (!data || !data.validade) return;

    const info = document.getElementById('certificação-info');
    const expiracao = document.getElementById('certificação-expiracao');
    
    if (info && expiracao) {
        info.style.display = 'flex';
        expiracao.textContent = new Date(data.validade).toLocaleDateString('pt-BR');
    }
}

/**
 * Salva configurações do certificação
 */
async function saveCertificaçãoConfig() {
    const form = document.getElementById('form-certificação');
    if (!form) return;

    const fileInput = document.getElementById('input-certificação');
    const senhaInput = form.querySelector('[name="certificação_senha"]');

    if (!fileInput.files[0]) {
        showNotification('Selecione um arquivo de certificação', 'error');
        return;
    }

    if (!senhaInput.value) {
        showNotification('Digite a senha do certificação', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('certificação', fileInput.files[0]);
    formData.append('senha', senhaInput.value);

    try {
        const response = await fetch('/api/configuracoes/certificação', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showNotification('Certificação salvo com sucesso!', 'success');
            closeConfigModal('modal-certificação');
            loadCertificaçãoData();
        } else {
            throw new Error('Erro ao salvar certificação');
        }
    } catch (error) {
        console.error('Erro ao salvar certificação:', error);
        showNotification('Erro ao salvar certificação', 'error');
    }
}

// =========================
// IMPORTAÇÉO DE NF-E
// =========================

/**
 * Carrega configurações de importação de NF-e
 */
async function loadNfeImportData() {
    try {
        const response = await fetch('/api/configuracoes/nfe-import');
        if (response.ok) {
            const data = await response.json();
            displayNfeImportInfo(data);
        }
    } catch (error) {
        console.error('Erro ao carregar config de NF-e:', error);
    }
}

/**
 * Exibe informações de importação de NF-e
 */
function displayNfeImportInfo(data) {
    const checkbox = document.getElementById('nfe-agente-ativo');
    const statusInfo = document.getElementById('nfe-status-info');
    const dataAtivacao = document.getElementById('nfe-data-ativacao');

    if (checkbox) {
        checkbox.checked = data.ativo || false;
    }

    if (data.ativo && statusInfo && dataAtivacao) {
        statusInfo.style.display = 'block';
        dataAtivacao.textContent = data.data_ativacao 
             new Date(data.data_ativacao).toLocaleString('pt-BR')
            : 'N/A';
    }
}

/**
 * Salva configurações de importação de NF-e
 */
async function saveNfeConfig() {
    const checkbox = document.getElementById('nfe-agente-ativo');
    if (!checkbox) return;

    const data = {
        ativo: checkbox.checked,
        data_ativacao: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/configuracoes/nfe-import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Configurações salvas com sucesso!', 'success');
            closeConfigModal('modal-nfe-import');
        } else {
            throw new Error('Erro ao salvar configurações');
        }
    } catch (error) {
        console.error('Erro ao salvar config de NF-e:', error);
        showNotification('Erro ao salvar configurações', 'error');
    }
}

// =========================
// FUNÇÕES AUXILIARES
// =========================

/**
 * Mostra notificação (versão local para config-modals)
 */
function showConfigNotification(message, type = 'info') {
    // Tenta usar o sistema de notificações do Aluforce se disponível
    const notificationArea = document.querySelector('.notification-area');
    if (notificationArea) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success'  'check-circle' : type === 'error'  'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        notificationArea.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
        return;
    }

    // Fallback: console log + toast simples
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Criar toast simples
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        padding: 12px 20px; border-radius: 8px; color: white;
        background: ${type === 'success'  '#10b981' : type === 'error'  '#ef4444' : '#3b82f6'};
        box-shaçãow: 0 4px 12px rgba(0,0,0,0.15); font-family: sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Alias para compatibilidade (evita loop infinito)
var showNotification = showConfigNotification;

// =========================
// EVENTOS DE UPLOAD DE ARQUIVOS
// =========================

// Atualizar nome do arquivo quando selecionação
document.addEventListener('DOMContentLoaded', function() {
    // Logo da empresa
    const logoInput = document.getElementById('input-logo');
    if (logoInput) {
        logoInput.addEventListener('change', function() {
            const file = this.files[0];
            const fileName = file ? file.name : 'Nenhum arquivo selecionação';
            const label = this.parentElement.querySelector('.config-file-upload-name');
            if (label) label.textContent = fileName;
            
            // Preview da imagem
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('logo-preview');
                    if (preview) {
                        preview.style.display = 'block';
                        preview.querySelector('img').src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Favicon
    const faviconInput = document.getElementById('input-favicon');
    if (faviconInput) {
        faviconInput.addEventListener('change', function() {
            const file = this.files[0];
            const fileName = file ? file.name : 'Nenhum arquivo selecionação';
            const label = this.parentElement.querySelector('.config-file-upload-name');
            if (label) label.textContent = fileName;
            
            // Preview da imagem
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('favicon-preview');
                    if (preview) {
                        preview.style.display = 'block';
                        preview.querySelector('img').src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Certificação digital
    const certInput = document.getElementById('input-certificação');
    if (certInput) {
        certInput.addEventListener('change', function() {
            const fileName = this.files[0]  this.files[0].name : 'Nenhum certificação selecionação';
            const label = this.parentElement.querySelector('.config-file-upload-name');
            if (label) label.textContent = fileName;
        });
    }

    // Toggle de NF-e
    const nfeToggle = document.getElementById('nfe-agente-ativo');
    const nfeStatus = document.getElementById('nfe-status-info');
    if (nfeToggle && nfeStatus) {
        nfeToggle.addEventListener('change', function() {
            nfeStatus.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Fechar modal ao clicar fora
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('config-detail-modal')) {
            closeAllConfigModals();
        }
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllConfigModals();
        }
    });

    // Aplicar máscaras nos campos
    const cnpjInput = document.getElementById('input-cnpj');
    if (cnpjInput) {
        cnpjInput.addEventListener('input', function(e) {
            e.target.value = maskCNPJ(e.target.value);
        });
    }

    const cepInput = document.getElementById('input-cep');
    if (cepInput) {
        cepInput.addEventListener('input', function(e) {
            e.target.value = maskCEP(e.target.value);
        });
    }

    const telefoneInput = document.getElementById('input-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function(e) {
            e.target.value = maskTelefone(e.target.value);
        });
    }
});

// =========================
// MÁSCARAS DE FORMATAÇÉO
// =========================

/**
 * Aplica máscara de CNPJ
 */
function maskCNPJ(value) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+$/, '$1');
}

/**
 * Aplica máscara de CEP
 */
function maskCEP(value) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+$/, '$1');
}

/**
 * Aplica máscara de Telefone
 */
function maskTelefone(value) {
    value = value.replace(/\D/g, '');
    
    if (value.length <= 10) {
        return value
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        return value
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+$/, '$1');
    }
}

// Exportar funções globalmente
window.abrirConfiguracao = abrirConfiguracao;
window.closeConfigModal = closeConfigModal;
window.saveEmpresaConfig = saveEmpresaConfig;
window.showNovaCategoriaForm = showNovaCategoriaForm;
window.editarCategoria = editarCategoria;
window.excluirCategoria = excluirCategoria;
window.showNovoDepartamentoForm = showNovoDepartamentoForm;
window.editarDepartamento = editarDepartamento;
window.excluirDepartamento = excluirDepartamento;
window.showNovoProjetoForm = showNovoProjetoForm;
window.editarProjeto = editarProjeto;
window.excluirProjeto = excluirProjeto;
window.saveCertificaçãoConfig = saveCertificaçãoConfig;
window.saveNfeConfig = saveNfeConfig;
window.saveVendaProdutosConfig = saveVendaProdutosConfig;
window.saveVendaServicosConfig = saveVendaServicosConfig;
window.saveClientesFornecedoresConfig = saveClientesFornecedoresConfig;
window.saveFinanceConfig = saveFinanceConfig;

// =========================
// FAMÍLIAS DE PRODUTOS
// =========================

function abrirModalIncluirFamilia() {
    showNotification('Modal de inclusão de família em desenvolvimento', 'info');
}

function importarPlanilhaFamilias() {
    showNotification('Importação de planilha em desenvolvimento', 'info');
}

function editarFamilia(id) {
    showNotification('Edição de família em desenvolvimento', 'info');
}

function anexosFamilia(id) {
    showNotification('Anexos de família em desenvolvimento', 'info');
}

function excluirFamilia(id) {
    if (confirm('Deseja realmente excluir está família de produtos')) {
        showNotification('Família excluída com sucesso!', 'success');
    }
}

// =========================
// CARACTERÍSTICAS DE PRODUTOS
// =========================

function abrirModalIncluirCaracteristica() {
    showNotification('Modal de inclusão de característica em desenvolvimento', 'info');
}

function editarCaracteristica(id) {
    showNotification('Edição de característica em desenvolvimento', 'info');
}

function excluirCaracteristica(id) {
    if (confirm('Deseja realmente excluir está característica')) {
        showNotification('Característica excluída com sucesso!', 'success');
    }
}

// =========================
// VENDEDORES
// =========================

async function abrirModalIncluirVendedor() {
    showNotification('Modal de inclusão de vendedor em desenvolvimento', 'info');
}

async function loadVendedoresData() {
    try {
        const response = await fetch('/api/configuracoes/vendedores');
        if (response.ok) {
            const vendedores = await response.json();
            displayVendedores(vendedores);
        }
    } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
    }
}

function displayVendedores(vendedores) {
    const tbody = document.getElementById('vendedores-list');
    if (!tbody || !vendedores.length) return;

    tbody.innerHTML = vendedores.map(v => `
        <tr>
            <td><span class="status-badge status-${v.situacao}">${v.situacao === 'ativo'  '<i class="fas fa-check-circle"></i> Ativo' : '<i class="fas fa-times-circle"></i> Inativo'}</span></td>
            <td>${v.nome}</td>
            <td>${v.comissao}%</td>
            <td>${v.email}</td>
            <td>${v.permissoes}</td>
            <td>${formatDate(v.inclusao)}</td>
            <td>
                <button class="config-btn-icon" onclick="editarVendedor(${v.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="config-btn-icon" onclick="anexosVendedor(${v.id})" title="Anexos">
                    <i class="fas fa-paperclip"></i>
                </button>
                <button class="config-btn-icon" onclick="transferirVendedor(${v.id})" title="Transferir">
                    <i class="fas fa-exchange-alt"></i>
                </button>
                <button class="config-btn-icon" onclick="emailsVendedor(${v.id})" title="Emails">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="config-btn-icon" onclick="excluirVendedor(${v.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editarVendedor(id) {
    showNotification('Edição de vendedor em desenvolvimento', 'info');
}

function anexosVendedor(id) {
    showNotification('Anexos de vendedor em desenvolvimento', 'info');
}

function transferirVendedor(id) {
    showNotification('Transferência de vendedor em desenvolvimento', 'info');
}

function emailsVendedor(id) {
    showNotification('Emails de vendedor em desenvolvimento', 'info');
}

async function excluirVendedor(id) {
    if (!confirm('Deseja realmente excluir este vendedor')) return;

    try {
        const response = await fetch(`/api/configuracoes/vendedores/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Vendedor excluído com sucesso!', 'success');
            loadVendedoresData();
        } else {
            throw new Error('Erro ao excluir vendedor');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao excluir vendedor', 'error');
    }
}

// =========================
// COMPRADORES
// =========================

async function abrirModalIncluirCompraçãor() {
    showNotification('Modal de inclusão de compraçãor em desenvolvimento', 'info');
}

async function loadCompraçãoresData() {
    try {
        const response = await fetch('/api/configuracoes/compraçãores');
        if (response.ok) {
            const compraçãores = await response.json();
            displayCompraçãores(compraçãores);
        }
    } catch (error) {
        console.error('Erro ao carregar compraçãores:', error);
    }
}

function displayCompraçãores(compraçãores) {
    const tbody = document.getElementById('compraçãores-list');
    if (!tbody || !compraçãores.length) return;

    tbody.innerHTML = compraçãores.map(c => `
        <tr>
            <td><span class="status-badge status-${c.situacao}">${c.situacao === 'ativo'  '<i class="fas fa-check-circle"></i> Ativo' : '<i class="fas fa-times-circle"></i> Inativo'}</span></td>
            <td>${c.nome}</td>
            <td>${formatDate(c.inclusao)}</td>
            <td>${formatDate(c.última_alteracao)}</td>
            <td>${c.incluido_por}</td>
            <td>
                <button class="config-btn-icon" onclick="editarCompraçãor(${c.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="config-btn-icon" onclick="anexosCompraçãor(${c.id})" title="Anexos">
                    <i class="fas fa-paperclip"></i>
                </button>
                <button class="config-btn-icon" onclick="inativarCompraçãor(${c.id})" title="Inativar">
                    <i class="fas fa-ban"></i>
                </button>
                <button class="config-btn-icon" onclick="excluirCompraçãor(${c.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editarCompraçãor(id) {
    showNotification('Edição de compraçãor em desenvolvimento', 'info');
}

function anexosCompraçãor(id) {
    showNotification('Anexos de compraçãor em desenvolvimento', 'info');
}

function inativarCompraçãor(id) {
    showNotification('Inativação de compraçãor em desenvolvimento', 'info');
}

async function excluirCompraçãor(id) {
    if (!confirm('Deseja realmente excluir este compraçãor')) return;

    try {
        const response = await fetch(`/api/configuracoes/compraçãores/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Compraçãor excluído com sucesso!', 'success');
            loadCompraçãoresData();
        } else {
            throw new Error('Erro ao excluir compraçãor');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao excluir compraçãor', 'error');
    }
}

// Exportar novas funções
window.abrirModalIncluirFamilia = abrirModalIncluirFamilia;
window.importarPlanilhaFamilias = importarPlanilhaFamilias;
window.editarFamilia = editarFamilia;
window.anexosFamilia = anexosFamilia;
window.excluirFamilia = excluirFamilia;
window.abrirModalIncluirCaracteristica = abrirModalIncluirCaracteristica;
window.editarCaracteristica = editarCaracteristica;
window.excluirCaracteristica = excluirCaracteristica;
window.abrirModalIncluirVendedor = abrirModalIncluirVendedor;
window.loadVendedoresData = loadVendedoresData;
window.editarVendedor = editarVendedor;
window.anexosVendedor = anexosVendedor;
window.transferirVendedor = transferirVendedor;
window.emailsVendedor = emailsVendedor;
window.excluirVendedor = excluirVendedor;
window.abrirModalIncluirCompraçãor = abrirModalIncluirCompraçãor;
window.loadCompraçãoresData = loadCompraçãoresData;
window.editarCompraçãor = editarCompraçãor;
window.anexosCompraçãor = anexosCompraçãor;
window.inativarCompraçãor = inativarCompraçãor;
window.excluirCompraçãor = excluirCompraçãor;

/**
 * Formata data para exibição
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekday = weekdays[d.getDay()];
    return `${day}/${month}/${year} ${weekday}`;
}

/**
 * Abre um modal específico
 */
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Fecha um modal específico
 */
function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

window.formatDate = formatDate;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
// =========================
// FUNÇÕES DE CARREGAMENTO DE DADOS - RH
// =========================

/**
 * Carrega daçãos de funcionários - agora usa a versão completa
 */
async function loadFuncionariosData() {
    await carregarFuncionariosCompleto();
}

function displayFuncionarios(funcionarios) {
    // Função legacy - usar renderizarFuncionarios
    funcionariosCache = funcionarios;
    renderizarFuncionarios();
}

/**
 * Carrega daçãos de cargos
 */
async function loadCargosData() {
    try {
        const response = await fetch('/api/rh/cargos');
        if (response.ok) {
            const result = await response.json();
            const cargos = result.data || result || [];
            displayCargos(cargos);
        }
    } catch (error) {
        console.error('Erro ao carregar cargos:', error);
    }
}

function displayCargos(cargos) {
    const tbody = document.getElementById('cargos-list');
    if (!tbody) return;

    if (!cargos.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum cargo cadastração</td></tr>';
        return;
    }

    tbody.innerHTML = cargos.map(c => `
        <tr>
            <td>${c.nome || ''}</td>
            <td>${c.departamento || ''}</td>
            <td>${c.nivel || ''}</td>
            <td>${c.cbo || ''}</td>
            <td>${c.total_funcionarios || 0}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarCargo('${c.nome}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirCargo('${c.nome}')" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Editar um cargo
 */
function editarCargo(nomeCargo) {
    // Por enquanto, apenas mostra uma notificação
    // TODO: Implementar modal de edição de cargo
    showConfigNotification(`Edição do cargo "${nomeCargo}" em desenvolvimento`, 'info');
}

/**
 * Excluir um cargo
 */
async function excluirCargo(nomeCargo) {
    if (!confirm(`Tem certeza que deseja excluir o cargo "${nomeCargo}"\n\nNota: Funcionários com este cargo serão mantidos, mas ficarão sem cargo definido.`)) {
        return;
    }
    
    // Por enquanto, apenas mostra uma notificação
    // TODO: Implementar exclusão real via API
    showConfigNotification(`Exclusão do cargo "${nomeCargo}" em desenvolvimento`, 'warning');
}

/**
 * Carrega daçãos da folha de pagamento
 */
async function loadFolhaPagamentoData() {
    try {
        const response = await fetch('/api/rh/configuracoes/folha-pagamento');
        if (response.ok) {
            const data = await response.json();
            if (data) {
                // Preencher campos do formulário
                const diaFechamento = document.querySelector('#modal-folha-pagamento select[name="dia_fechamento"]');
                const diaPagamento = document.querySelector('#modal-folha-pagamento select[name="dia_pagamento"]');
                if (diaFechamento) diaFechamento.value = data.dia_fechamento || '25';
                if (diaPagamento) diaPagamento.value = data.dia_pagamento || '5';
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de folha:', error);
    }
}

/**
 * Carrega daçãos do ponto eletrônico
 */
async function loadPontoEletronicoData() {
    try {
        const response = await fetch('/api/rh/configuracoes/ponto-eletronico');
        if (response.ok) {
            const data = await response.json();
            if (data) {
                // Preencher campos do formulário
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de ponto:', error);
    }
}

// =========================
// FUNÇÕES DE CARREGAMENTO - FINANÇAS
// =========================

/**
 * Carrega daçãos do plano de contas
 */
async function loadPlanoContasData() {
    try {
        const response = await fetch('/api/financeiro/plano-contas');
        if (response.ok) {
            const result = await response.json();
            const contas = result.data || result || [];
            displayPlanoContas(contas);
        }
    } catch (error) {
        console.error('Erro ao carregar plano de contas:', error);
    }
}

function displayPlanoContas(contas) {
    // Implementar exibição em árvore
    console.log('Plano de contas carregação:', contas.length, 'contas');
}

/**
 * Carrega daçãos de contas bancárias
 */
async function loadContasBancariasData() {
    try {
        const response = await fetch('/api/financeiro/contas-bancarias');
        if (response.ok) {
            const result = await response.json();
            const contas = result.data || result || [];
            displayContasBancarias(contas);
        }
    } catch (error) {
        console.error('Erro ao carregar contas bancárias:', error);
    }
}

function displayContasBancarias(contas) {
    const tbody = document.getElementById('contas-bancarias-list');
    if (!tbody) return;

    if (!contas.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma conta cadastrada</td></tr>';
        return;
    }

    let saldoTotal = 0;
    tbody.innerHTML = contas.map(c => {
        saldoTotal += parseFloat(c.saldo_atual || 0);
        return `
            <tr>
                <td><span class="status-badge status-${c.status || 'ativo'}"><i class="fas fa-check-circle"></i> ${c.status || 'Ativo'}</span></td>
                <td>${c.banco || ''}</td>
                <td>${c.agencia || ''}</td>
                <td>${c.conta || ''}</td>
                <td>${c.tipo || 'Corrente'}</td>
                <td class="text-right">R$ ${formatMoney(c.saldo_atual || 0)}</td>
                <td>${formatDate(c.ultima_conciliacao) || '-'}</td>
                <td class="config-actions">
                    <button class="config-btn-icon" onclick="editarContaBancaria(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="config-btn-icon" onclick="conciliarConta(${c.id})" title="Conciliar"><i class="fas fa-check-double"></i></button>
                    <button class="config-btn-icon danger" onclick="excluirContaBancaria(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    // Atualizar saldo total
    const saldoTotalEl = document.getElementById('saldo-total-bancario');
    if (saldoTotalEl) saldoTotalEl.textContent = `R$ ${formatMoney(saldoTotal)}`;
}

/**
 * Carrega daçãos de formas de pagamento
 */
async function loadFormasPagamentoData() {
    try {
        const response = await fetch('/api/financeiro/formas-pagamento');
        if (response.ok) {
            const result = await response.json();
            const formas = result.data || result || [];
            displayFormasPagamento(formas);
        }
    } catch (error) {
        console.error('Erro ao carregar formas de pagamento:', error);
    }
}

function displayFormasPagamento(formas) {
    const tbody = document.getElementById('formas-pagamento-list');
    if (!tbody) return;

    tbody.innerHTML = formas.map(f => `
        <tr>
            <td><span class="status-badge status-${f.status || 'ativo'}"><i class="fas fa-check-circle"></i> ${f.status || 'Ativo'}</span></td>
            <td><i class="${getPaymentIcon(f.tipo)}"></i> ${f.nome || ''}</td>
            <td>${f.tipo || ''}</td>
            <td>${f.prazo || 0}</td>
            <td>${f.taxa || 0}%</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarFormaPagamento(${f.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirFormaPagamento(${f.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function getPaymentIcon(tipo) {
    const icons = {
        'dinheiro': 'fas fa-money-bill-wave',
        'pix': 'fas fa-qrcode',
        'cartao': 'fas fa-credit-card',
        'boleto': 'fas fa-barcode',
        'transferencia': 'fas fa-university'
    };
    return icons[tipo.toLowerCase()] || 'fas fa-money-check';
}

/**
 * Carrega daçãos de impostos
 */
async function loadImpostosData() {
    try {
        const response = await fetch('/api/configuracoes/impostos');
        if (response.ok) {
            const data = await response.json();
            if (data) {
                // Preencher campos
            }
        }
    } catch (error) {
        console.error('Erro ao carregar impostos:', error);
    }
}

// =========================
// FUNÇÕES DE CARREGAMENTO - CLIENTES/FORNECEDORES
// =========================

/**
 * Carrega daçãos de grupos de clientes
 */
async function loadGruposClientesData() {
    try {
        const response = await fetch('/api/clientes/grupos');
        if (response.ok) {
            const result = await response.json();
            const grupos = result.data || result || [];
            displayGruposClientes(grupos);
        }
    } catch (error) {
        console.error('Erro ao carregar grupos de clientes:', error);
    }
}

function displayGruposClientes(grupos) {
    const tbody = document.querySelector('#modal-grupos-clientes tbody');
    if (!tbody) return;

    tbody.innerHTML = grupos.map(g => `
        <tr>
            <td>${g.nome || ''}</td>
            <td>${g.desconto || 0}%</td>
            <td>${g.prazo_padrao || 0} dias</td>
            <td>${g.total_clientes || 0}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarGrupoCliente(${g.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirGrupoCliente(${g.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Carrega daçãos de regiões de venda
 */
async function loadRegioesVendaData() {
    try {
        const response = await fetch('/api/vendas/regioes');
        if (response.ok) {
            const result = await response.json();
            const regioes = result.data || result || [];
            displayRegioesVenda(regioes);
        }
    } catch (error) {
        console.error('Erro ao carregar regiões de venda:', error);
    }
}

function displayRegioesVenda(regioes) {
    const tbody = document.querySelector('#modal-regioes-venda tbody');
    if (!tbody) return;

    tbody.innerHTML = regioes.map(r => `
        <tr>
            <td>${r.nome || ''}</td>
            <td>${r.estaçãos || ''}</td>
            <td>${r.vendedor_responsavel || ''}</td>
            <td>${r.total_clientes || 0}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarRegiao(${r.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirRegiao(${r.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Carrega daçãos de tipos de fornecedor
 */
async function loadTiposFornecedorData() {
    try {
        const response = await fetch('/api/fornecedores/tipos');
        if (response.ok) {
            const result = await response.json();
            const tipos = result.data || result || [];
            displayTiposFornecedor(tipos);
        }
    } catch (error) {
        console.error('Erro ao carregar tipos de fornecedor:', error);
    }
}

function displayTiposFornecedor(tipos) {
    const tbody = document.querySelector('#modal-tipos-fornecedor tbody');
    if (!tbody) return;

    tbody.innerHTML = tipos.map(t => `
        <tr>
            <td>${t.nome || ''}</td>
            <td>${t.descricao || ''}</td>
            <td>${t.total_fornecedores || 0}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarTipoFornecedor(${t.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirTipoFornecedor(${t.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Carrega daçãos de condições de pagamento
 */
async function loadCondicoesPagamentoData() {
    try {
        const response = await fetch('/api/configuracoes/condicoes-pagamento');
        if (response.ok) {
            const result = await response.json();
            const condicoes = result.data || result || [];
            displayCondicoesPagamento(condicoes);
        }
    } catch (error) {
        console.error('Erro ao carregar condições de pagamento:', error);
    }
}

function displayCondicoesPagamento(condicoes) {
    const tbody = document.querySelector('#modal-condicoes-pagamento tbody');
    if (!tbody) return;

    tbody.innerHTML = condicoes.map(c => `
        <tr>
            <td>${c.nome || ''}</td>
            <td>${c.parcelas || 1}</td>
            <td>${c.prazo || 0} dias</td>
            <td>${c.acrescimo || 0}%</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarCondicao(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirCondicao(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// FUNÇÕES DE CARREGAMENTO - PRODUTOS
// =========================

/**
 * Carrega daçãos de tabelas de preço
 */
async function loadTabelasPrecoData() {
    try {
        const response = await fetch('/api/produtos/tabelas-preco');
        if (response.ok) {
            const result = await response.json();
            const tabelas = result.data || result || [];
            displayTabelasPreco(tabelas);
        }
    } catch (error) {
        console.error('Erro ao carregar tabelas de preço:', error);
    }
}

function displayTabelasPreco(tabelas) {
    const tbody = document.querySelector('#modal-tabelas-preco tbody');
    if (!tbody) return;

    tbody.innerHTML = tabelas.map(t => `
        <tr>
            <td><span class="status-badge status-${t.status || 'ativo'}"><i class="fas fa-check-circle"></i> ${t.status === 'ativo'  'Ativa' : 'Inativa'}</span></td>
            <td>${t.nome || ''}</td>
            <td>${t.tipo || ''}</td>
            <td>${formatDate(t.validade) || '-'}</td>
            <td>${t.total_produtos || 0}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarTabelaPreco(${t.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirTabelaPreco(${t.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Carrega daçãos de unidades de medida
 */
async function loadUnidadesMedidaData() {
    try {
        const response = await fetch('/api/produtos/unidades-medida');
        if (response.ok) {
            const result = await response.json();
            const unidades = result.data || result || [];
            displayUnidadesMedida(unidades);
        }
    } catch (error) {
        console.error('Erro ao carregar unidades de medida:', error);
    }
}

function displayUnidadesMedida(unidades) {
    const tbody = document.querySelector('#modal-unidades-medida tbody');
    if (!tbody) return;

    tbody.innerHTML = unidades.map(u => `
        <tr>
            <td><strong>${u.sigla || ''}</strong></td>
            <td>${u.nome || ''}</td>
            <td>${u.tipo || ''}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarUnidade(${u.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirUnidade(${u.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// CÓDIGOS NCM
// =========================

async function loadNCMData() {
    console.log('Carregando códigos NCM...');
    try {
        const response = await fetch('/api/produtos/ncm');
        if (response.ok) {
            const result = await response.json();
            const ncms = result.data || result || [];
            displayNCM(ncms);
        }
    } catch (error) {
        console.error('Erro ao carregar NCM:', error);
    }
}

function displayNCM(ncms) {
    const tbody = document.querySelector('#modal-ncm tbody');
    if (!tbody) return;

    if (ncms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="config-empty">Nenhum código NCM cadastração</td></tr>`;
        return;
    }

    tbody.innerHTML = ncms.map(n => `
        <tr>
            <td><strong>${n.codigo || ''}</strong></td>
            <td>${n.descricao || ''}</td>
            <td>${n.aliquota_ipi ? n.aliquota_ipi + '%' : '-'}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarNCM(${n.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirNCM(${n.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// TIPOS DE SERVIÇO
// =========================

async function loadTiposServicoData() {
    console.log('Carregando tipos de serviço...');
    try {
        const response = await fetch('/api/servicos/tipos');
        if (response.ok) {
            const result = await response.json();
            const tipos = result.data || result || [];
            displayTiposServico(tipos);
        }
    } catch (error) {
        console.error('Erro ao carregar tipos de serviço:', error);
    }
}

function displayTiposServico(tipos) {
    const tbody = document.querySelector('#modal-tipos-servico tbody');
    if (!tbody) return;

    if (tipos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="config-empty">Nenhum tipo de serviço cadastração</td></tr>`;
        return;
    }

    tbody.innerHTML = tipos.map(t => `
        <tr>
            <td><strong>${t.codigo || ''}</strong></td>
            <td>${t.nome || ''}</td>
            <td>${t.descricao || ''}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarTipoServico(${t.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirTipoServico(${t.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// MODELOS DE CONTRATO
// =========================

async function loadContratosData() {
    console.log('Carregando modelos de contrato...');
    try {
        const response = await fetch('/api/servicos/contratos/modelos');
        if (response.ok) {
            const result = await response.json();
            const contratos = result.data || result || [];
            displayContratos(contratos);
        }
    } catch (error) {
        console.error('Erro ao carregar contratos:', error);
    }
}

function displayContratos(contratos) {
    const tbody = document.querySelector('#modal-contratos tbody');
    if (!tbody) return;

    if (contratos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="config-empty">Nenhum modelo de contrato cadastração</td></tr>`;
        return;
    }

    tbody.innerHTML = contratos.map(c => `
        <tr>
            <td><strong>${c.nome || ''}</strong></td>
            <td>${c.tipo || ''}</td>
            <td><span class="status-badge ${c.ativo ? 'status-ativo' : 'status-inativo'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarContrato(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon" onclick="visualizarContrato(${c.id})" title="Visualizar"><i class="fas fa-eye"></i></button>
                <button class="config-btn-icon danger" onclick="excluirContrato(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// SLA DE ATENDIMENTO
// =========================

async function loadSLAData() {
    console.log('Carregando configurações de SLA...');
    try {
        const response = await fetch('/api/servicos/sla');
        if (response.ok) {
            const result = await response.json();
            const slas = result.data || result || [];
            displaySLA(slas);
        }
    } catch (error) {
        console.error('Erro ao carregar SLA:', error);
    }
}

function displaySLA(slas) {
    const tbody = document.querySelector('#modal-sla tbody');
    if (!tbody) return;

    if (slas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="config-empty">Nenhuma configuração de SLA cadastrada</td></tr>`;
        return;
    }

    tbody.innerHTML = slas.map(s => `
        <tr>
            <td><strong>${s.nome || ''}</strong></td>
            <td>${s.prioridade || ''}</td>
            <td>${s.tempo_resposta || ''}</td>
            <td>${s.tempo_resolucao || ''}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarSLA(${s.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon danger" onclick="excluirSLA(${s.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =========================
// NFS-e (NOTA FISCAL DE SERVIÇO)
// =========================

async function loadNFSeData() {
    console.log('Carregando configurações NFS-e...');
    try {
        const response = await fetch('/api/nfse/configuracoes');
        if (response.ok) {
            const result = await response.json();
            populateNFSeForm(result.data || result || {});
        }
    } catch (error) {
        console.error('Erro ao carregar NFS-e:', error);
    }
}

function populateNFSeForm(config) {
    // Prefeitura
    const prefeitura = document.getElementById('nfse-prefeitura');
    if (prefeitura) prefeitura.value = config.prefeitura || '';

    // Código do município
    const codMunicipio = document.getElementById('nfse-cod-municipio');
    if (codMunicipio) codMunicipio.value = config.codigo_municipio || '';

    // Regime tributário
    const regime = document.getElementById('nfse-regime');
    if (regime) regime.value = config.regime_tributario || '';

    // Incentivaçãor cultural
    const incentivo = document.getElementById('nfse-incentivaçãor');
    if (incentivo) incentivo.checked = config.incentivaçãor_cultural || false;

    // Série RPS
    const serieRps = document.getElementById('nfse-serie-rps');
    if (serieRps) serieRps.value = config.serie_rps || '';

    // Próximo número RPS
    const numRps = document.getElementById('nfse-numero-rps');
    if (numRps) numRps.value = config.proximo_numero_rps || '';

    // Alíquota ISS
    const aliquota = document.getElementById('nfse-aliquota-iss');
    if (aliquota) aliquota.value = config.aliquota_iss || '';

    // Código do serviço
    const codServico = document.getElementById('nfse-cod-servico');
    if (codServico) codServico.value = config.codigo_servico || '';
}

// =========================
// FUNÇÕES AUXILIARES
// =========================

/**
 * Formata valor monetário
 */
function formatMoney(value) {
    return parseFloat(value || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// =========================
// GESTÃO DE FUNCIONÁRIOS - COMPLETO
// =========================

let funcionariosCache = [];
let funcionariosPagina = 1;
let funcionariosTotal = 0;
const funcionariosPorPagina = 10;

/**
 * Carrega lista de funcionários do servidor
 */
async function carregarFuncionariosCompleto() {
    try {
        const tbody = document.getElementById('funcionarios-list');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';
        }
        
        const response = await fetch('/api/rh/funcionarios', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            // A API retorna { funcionarios: [...], stats: {...} }
            funcionariosCache = result.funcionarios || result.data || result || [];
            // Normalizar campos - converter nome_completo para nome
            funcionariosCache = funcionariosCache.map(f => ({
                ...f,
                nome: f.nome_completo || f.nome,
                pis: f.pis_pasep || f.pis
            }));
            funcionariosTotal = funcionariosCache.length;
            renderizarFuncionarios();
        } else {
            throw new Error('Erro ao carregar funcionários');
        }
    } catch (error) {
        console.error('Erro:', error);
        const tbody = document.getElementById('funcionarios-list');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: #6c757d;">Nenhum funcionário cadastração</td></tr>';
        }
    }
}

function renderizarFuncionarios(lista = null) {
    const tbody = document.getElementById('funcionarios-list');
    const info = document.getElementById('funcionarios-info');
    if (!tbody) return;
    
    const daçãos = lista || funcionariosCache;
    
    if (!daçãos.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: #6c757d;">Nenhum funcionário cadastração</td></tr>';
        if (info) info.textContent = '0 funcionários encontrados';
        return;
    }
    
    const inicio = (funcionariosPagina - 1) * funcionariosPorPagina;
    const fim = Math.min(inicio + funcionariosPorPagina, daçãos.length);
    const paginaçãos = daçãos.slice(inicio, fim);
    
    tbody.innerHTML = paginaçãos.map(f => {
        // Normalizar status para lowercase para comparação
        const statusLower = (f.status || 'ativo').toLowerCase();
        const statusClass = statusLower === 'ativo'  'status-ativo' : 
                           statusLower === 'inativo'  'status-inativo' : 
                           statusLower === 'ferias' || statusLower === 'férias'  'status-ferias' : 'status-afastação';
        const statusIcon = statusLower === 'ativo'  'check-circle' : 
                          statusLower === 'inativo'  'times-circle' : 
                          statusLower === 'ferias' || statusLower === 'férias'  'umbrella-beach' : 'user-clock';
        const statusLabel = f.status || 'Ativo';
        
        return `
        <tr>
            <td><span class="status-badge ${statusClass}"><i class="fas fa-${statusIcon}"></i> ${statusLabel}</span></td>
            <td>${f.nome || ''}</td>
            <td>${f.cargo || ''}</td>
            <td>${f.departamento || ''}</td>
            <td>${formatDate(f.data_admissao) || '-'}</td>
            <td class="config-actions">
                <button class="config-btn-icon" onclick="editarFuncionario(${f.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="config-btn-icon" onclick="verDetalhesFuncionario(${f.id})" title="Ver detalhes"><i class="fas fa-eye"></i></button>
                <button class="config-btn-icon danger" onclick="excluirFuncionario(${f.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    
    if (info) {
        info.textContent = `Mostrando ${inicio + 1}-${fim} de ${daçãos.length} funcionários`;
    }
    
    renderizarPaginacaoFuncionarios(daçãos.length);
}

function renderizarPaginacaoFuncionarios(total) {
    const container = document.getElementById('funcionarios-paginacao');
    if (!container) return;
    
    const totalPaginas = Math.ceil(total / funcionariosPorPagina);
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="config-btn-icon" onclick="funcionariosPagina = 1; renderizarFuncionarios()" ${funcionariosPagina === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    html += `<button class="config-btn-icon" onclick="funcionariosPagina--; renderizarFuncionarios()" ${funcionariosPagina === 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>`;
    
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= funcionariosPagina - 1 && i <= funcionariosPagina + 1)) {
            html += `<button class="config-btn-icon ${i === funcionariosPagina ? 'active' : ''}" onclick="funcionariosPagina = ${i}; renderizarFuncionarios()">${i}</button>`;
        } else if (i === funcionariosPagina - 2 || i === funcionariosPagina + 2) {
            html += `<span style="padding: 0 5px;">...</span>`;
        }
    }
    
    html += `<button class="config-btn-icon" onclick="funcionariosPagina++; renderizarFuncionarios()" ${funcionariosPagina === totalPaginas ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>`;
    html += `<button class="config-btn-icon" onclick="funcionariosPagina = ${totalPaginas}; renderizarFuncionarios()" ${funcionariosPagina === totalPaginas ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
    
    container.innerHTML = html;
}

function buscarFuncionarios(termo) {
    if (!termo) {
        renderizarFuncionarios();
        return;
    }
    
    const filtraçãos = funcionariosCache.filter(f => 
        (f.nome || f.nome_completo || '').toLowerCase().includes(termo.toLowerCase()) ||
        (f.cargo || '').toLowerCase().includes(termo.toLowerCase()) ||
        (f.departamento || '').toLowerCase().includes(termo.toLowerCase()) ||
        (f.cpf || '').includes(termo) ||
        (f.email || '').toLowerCase().includes(termo.toLowerCase())
    );
    
    funcionariosPagina = 1;
    renderizarFuncionarios(filtraçãos);
}

function filtrarFuncionariosPorStatus(status) {
    if (!status) {
        renderizarFuncionarios();
        return;
    }
    
    // Comparação case-insensitive
    const filtraçãos = funcionariosCache.filter(f => (f.status || '').toLowerCase() === status.toLowerCase());
    funcionariosPagina = 1;
    renderizarFuncionarios(filtraçãos);
}

function abrirModalNovoFuncionario() {
    document.getElementById('titulo-form-funcionario').textContent = 'Novo Funcionário';
    document.getElementById('form-funcionario').reset();
    document.getElementById('func-id').value = '';
    document.getElementById('func-status').value = 'ativo';
    abrirModal('modal-form-funcionario');
}

async function editarFuncionario(id) {
    try {
        const funcionario = funcionariosCache.find(f => f.id === id);
        if (!funcionario) return;
        
        document.getElementById('titulo-form-funcionario').textContent = 'Editar Funcionário';
        document.getElementById('func-id').value = funcionario.id;
        document.getElementById('func-nome').value = funcionario.nome_completo || funcionario.nome || '';
        document.getElementById('func-cpf').value = funcionario.cpf || '';
        document.getElementById('func-rg').value = funcionario.rg || '';
        document.getElementById('func-nascimento').value = funcionario.data_nascimento ? funcionario.data_nascimento.split('T')[0] : '';
        document.getElementById('func-email').value = funcionario.email || '';
        document.getElementById('func-telefone').value = funcionario.telefone || '';
        document.getElementById('func-cargo').value = funcionario.cargo || '';
        document.getElementById('func-departamento').value = funcionario.departamento || '';
        document.getElementById('func-admissao').value = funcionario.data_admissao ? funcionario.data_admissao.split('T')[0] : '';
        document.getElementById('func-salario').value = funcionario.salario || '';
        document.getElementById('func-status').value = funcionario.status || 'ativo';
        document.getElementById('func-pis').value = funcionario.pis_pasep || funcionario.pis || '';
        
        // Tentar separar o endereço se vier concatenação
        const endereco = funcionario.endereco || '';
        const partesEndereco = endereco.split(',').map(p => p.trim());
        document.getElementById('func-endereco').value = partesEndereco[0] || '';
        document.getElementById('func-numero').value = partesEndereco[1] || funcionario.numero || '';
        document.getElementById('func-bairro').value = partesEndereco[2] || funcionario.bairro || '';
        document.getElementById('func-cidade').value = partesEndereco[3] || funcionario.cidade || '';
        document.getElementById('func-cep').value = partesEndereco[4] || funcionario.cep || '';
        
        abrirModal('modal-form-funcionario');
    } catch (error) {
        console.error('Erro ao carregar funcionário:', error);
        alert('Erro ao carregar daçãos do funcionário');
    }
}

async function salvarFuncionario(event) {
    event.preventDefault();
    
    const form = document.getElementById('form-funcionario');
    const formData = new FormData(form);
    const daçãos = Object.fromEntries(formData.entries());
    
    // Mapear campos do formulário para os nomes esperaçãos pela API
    const daçãosAPI = {
        nome_completo: daçãos.nome || '',
        email: daçãos.email || '',
        cpf: daçãos.cpf || '',
        rg: daçãos.rg || '',
        telefone: daçãos.telefone || '',
        cargo: daçãos.cargo || '',
        departamento: daçãos.departamento || '',
        status: daçãos.status || 'ativo',
        data_nascimento: daçãos.data_nascimento || null,
        data_admissao: daçãos.data_admissao || null,
        pis_pasep: daçãos.pis || '',
        salario: daçãos.salario  daçãos.salario.replace(/[^\d.,]/g, '').replace(',', '.') : null,
        // Montar endereço completo
        endereco: [daçãos.endereco, daçãos.numero, daçãos.bairro, daçãos.cidade, daçãos.cep].filter(Boolean).join(', ') || ''
    };
    
    try {
        const id = daçãos.id;
        const url = id  `/api/rh/funcionarios/${id}` : '/api/rh/funcionarios';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify(daçãosAPI)
        });
        
        if (response.ok) {
            fecharModal('modal-form-funcionario');
            await carregarFuncionariosCompleto();
            showToast(id ? 'Funcionário atualização com sucesso!' : 'Funcionário cadastração com sucesso!', 'success');
            
            // Registrar no audit log
            registrarAuditFrontend(id ? 'editar' : 'criar', 'rh', `${id ? 'Editou' : 'Criou'} funcionário: ${daçãos.nome}`);
            
            // Registrar na central de notificações
            if (window.registrarAcao) {
                window.registrarAcao(id ? 'editar' : 'criar', 'rh', `Funcionário: ${daçãos.nome}`);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message || 'Erro ao salvar funcionário');
    }
}

async function excluirFuncionario(id) {
    const funcionario = funcionariosCache.find(f => f.id === id);
    if (!funcionario) return;
    
    if (!confirm(`Deseja realmente excluir o funcionário "${funcionario.nome}"`)) return;
    
    try {
        const response = await fetch(`/api/rh/funcionarios/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        if (response.ok) {
            await carregarFuncionariosCompleto();
            showToast('Funcionário excluído com sucesso!', 'success');
            registrarAuditFrontend('excluir', 'rh', `Excluiu funcionário: ${funcionario.nome}`);
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir funcionário');
    }
}

function verDetalhesFuncionario(id) {
    const funcionario = funcionariosCache.find(f => f.id === id);
    if (!funcionario) return;
    
    alert(`Detalhes do Funcionário:
    
Nome: ${funcionario.nome || '-'}
CPF: ${funcionario.cpf || '-'}
Cargo: ${funcionario.cargo || '-'}
Departamento: ${funcionario.departamento || '-'}
Data Admissão: ${formatDate(funcionario.data_admissao) || '-'}
Status: ${funcionario.status || '-'}
Email: ${funcionario.email || '-'}
Telefone: ${funcionario.telefone || '-'}`);
}

function importarFuncionarios() {
    abrirModal('modal-importar-funcionarios');
}

async function processarArquivoImportacao(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('arquivo', file);
    
    try {
        const response = await fetch('/api/rh/funcionarios/importar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            fecharModal('modal-importar-funcionarios');
            await carregarFuncionariosCompleto();
            showToast(`${result.importaçãos || 0} funcionários importaçãos com sucesso!`, 'success');
        } else {
            throw new Error('Erro na importação');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao importar arquivo. Verifique o formato.');
    }
}

function exportarFuncionarios() {
    if (!funcionariosCache.length) {
        alert('Não há funcionários para exportar');
        return;
    }
    
    // Criar CSV
    const headers = ['Nome', 'CPF', 'Cargo', 'Departamento', 'Data Admissão', 'Status', 'Email', 'Telefone'];
    const rows = funcionariosCache.map(f => [
        f.nome || '',
        f.cpf || '',
        f.cargo || '',
        f.departamento || '',
        formatDate(f.data_admissao) || '',
        f.status || '',
        f.email || '',
        f.telefone || ''
    ]);
    
    let csv = headers.join(';') + '\n';
    rows.forEach(row => {
        csv += row.join(';') + '\n';
    });
    
    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `funcionarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function baixarModeloImportacao() {
    const headers = ['Nome', 'CPF', 'Cargo', 'Departamento', 'Data Admissão (DD/MM/AAAA)', 'Email', 'Telefone'];
    const exemplo = ['João da Silva', '123.456.789-00', 'Operaçãor', 'Produção', '01/01/2024', 'joao@email.com', '(11) 99999-0000'];
    
    let csv = headers.join(';') + '\n';
    csv += exemplo.join(';') + '\n';
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_funcionarios.csv';
    link.click();
}

// =========================
// HISTÓRICO DE ALTERAÇÕES - AUDITORIA
// =========================

let historicoCache = [];
let historicoPagina = 1;
const historicoPorPagina = 20;

async function carregarHistoricoAlteracoes() {
    try {
        const container = document.getElementById('historico-container');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Carregando histórico...</div>';
        }
        
        // Carregar usuários para o filtro
        await carregarUsuariosParaFiltro();
        
        // Carregar logs
        const response = await fetch('/api/audit-loglimite=500');
        if (response.ok) {
            const result = await response.json();
            historicoCache = result.logs || [];
            renderizarHistorico();
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        const container = document.getElementById('historico-container');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">Erro ao carregar histórico</div>';
        }
    }
}

async function carregarUsuariosParaFiltro() {
    try {
        const response = await fetch('/api/usuarios', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            const usuarios = result.data || result || [];
            
            const select = document.getElementById('filtro-usuario');
            if (select) {
                select.innerHTML = '<option value="">Todos os Colaboraçãores</option>';
                usuarios.forEach(u => {
                    select.innerHTML += `<option value="${u.nome}">${u.nome}${u.status === 'inativo'  ' (Inativo)' : ''}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function renderizarHistorico(lista = null) {
    const container = document.getElementById('historico-container');
    if (!container) return;
    
    const daçãos = lista || historicoCache;
    
    if (!daçãos.length) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;">Nenhum registro encontrado</div>';
        atualizarPaginacaoHistorico(0);
        return;
    }
    
    const inicio = (historicoPagina - 1) * historicoPorPagina;
    const fim = Math.min(inicio + historicoPorPagina, daçãos.length);
    const paginaçãos = daçãos.slice(inicio, fim);
    
    container.innerHTML = paginaçãos.map(log => {
        const iniciais = (log.usuario || 'SI').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const badgeClass = getBadgeClass(log.acao);
        const badgeIcon = getBadgeIcon(log.acao);
        const dataFormatada = formatarDataHora(log.data);
        
        return `
        <div class="historico-item">
            <div class="historico-avatar" style="background: linear-gradient(135deg, ${getAvatarColor(log.modulo)});">${iniciais}</div>
            <div class="historico-content">
                <div class="historico-header">
                    <span class="historico-usuario">${log.usuario || 'Sistema'}</span>
                    <span class="historico-badge ${badgeClass}"><i class="fas fa-${badgeIcon}"></i> ${capitalizar(log.acao)}</span>
                    <span class="historico-modulo">${capitalizar(log.modulo)}</span>
                </div>
                <p class="historico-descricao">${log.descricao || 'Ação registrada no sistema'}</p>
                <div class="historico-detalhes">
                    <span class="historico-time"><i class="fas fa-clock"></i> ${dataFormatada}</span>
                    ${log.ip  `<span class="historico-ip"><i class="fas fa-globe"></i> ${log.ip}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
    
    atualizarPaginacaoHistorico(daçãos.length);
}

function atualizarPaginacaoHistorico(total) {
    const infoSpan = document.querySelector('#modal-historico-alteracoes .config-detail-modal-body > div:last-child > span');
    const paginacaoDiv = document.querySelector('#modal-historico-alteracoes .config-detail-modal-body > div:last-child > div:last-child');
    
    if (infoSpan) {
        const inicio = Math.min((historicoPagina - 1) * historicoPorPagina + 1, total);
        const fim = Math.min(historicoPagina * historicoPorPagina, total);
        infoSpan.textContent = `Mostrando ${inicio}-${fim} de ${total} registros`;
    }
    
    if (paginacaoDiv) {
        const totalPaginas = Math.ceil(total / historicoPorPagina);
        if (totalPaginas <= 1) {
            paginacaoDiv.innerHTML = '';
            return;
        }
        
        let html = '';
        html += `<button class="config-btn-icon" onclick="historicoPagina = 1; renderizarHistorico()" ${historicoPagina === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
        html += `<button class="config-btn-icon" onclick="historicoPagina--; renderizarHistorico()" ${historicoPagina === 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>`;
        
        for (let i = 1; i <= Math.min(5, totalPaginas); i++) {
            const pagina = i <= 3  i : (i === 4 ? totalPaginas - 1 : totalPaginas);
            if (i === 4 && totalPaginas > 5) {
                html += `<button class="config-btn-icon" disabled>...</button>`;
            }
            html += `<button class="config-btn-icon ${pagina === historicoPagina ? 'active' : ''}" style="${pagina === historicoPagina ? 'background: #3498db; color: white;' : ''}" onclick="historicoPagina = ${pagina}; renderizarHistorico()">${pagina}</button>`;
        }
        
        html += `<button class="config-btn-icon" onclick="historicoPagina++; renderizarHistorico()" ${historicoPagina === totalPaginas ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>`;
        html += `<button class="config-btn-icon" onclick="historicoPagina = ${totalPaginas}; renderizarHistorico()" ${historicoPagina === totalPaginas ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
        
        paginacaoDiv.innerHTML = html;
    }
}

function filtrarHistorico() {
    const modulo = document.getElementById('filtro-modulo').value || '';
    const usuario = document.getElementById('filtro-usuario').value || '';
    const acao = document.getElementById('filtro-acao').value || '';
    const dataInicio = document.getElementById('filtro-data-inicio').value || '';
    const dataFim = document.getElementById('filtro-data-fim').value || '';
    
    let filtraçãos = [...historicoCache];
    
    if (modulo) {
        filtraçãos = filtraçãos.filter(l => (l.modulo || '').toLowerCase() === modulo.toLowerCase());
    }
    if (usuario) {
        filtraçãos = filtraçãos.filter(l => (l.usuario || '').toLowerCase().includes(usuario.toLowerCase()));
    }
    if (acao) {
        filtraçãos = filtraçãos.filter(l => (l.acao || '').toLowerCase() === acao.toLowerCase());
    }
    if (dataInicio) {
        filtraçãos = filtraçãos.filter(l => new Date(l.data) >= new Date(dataInicio));
    }
    if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        filtraçãos = filtraçãos.filter(l => new Date(l.data) <= fim);
    }
    
    historicoPagina = 1;
    renderizarHistorico(filtraçãos);
}

function exportarHistorico() {
    if (!historicoCache.length) {
        alert('Não há registros para exportar');
        return;
    }
    
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Módulo', 'Descrição', 'IP'];
    const rows = historicoCache.map(l => [
        formatarDataHora(l.data),
        l.usuario || 'Sistema',
        l.acao || '',
        l.modulo || '',
        l.descricao || '',
        l.ip || ''
    ]);
    
    let csv = headers.join(';') + '\n';
    rows.forEach(row => {
        csv += row.map(c => `"${c}"`).join(';') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Funções auxiliares para histórico
function getBadgeClass(acao) {
    const classes = {
        'criar': 'badge-criar',
        'editar': 'badge-editar',
        'excluir': 'badge-excluir',
        'login': 'badge-login',
        'config': 'badge-config',
        'configurar': 'badge-config',
        'perfil': 'badge-perfil'
    };
    return classes[(acao || '').toLowerCase()] || 'badge-info';
}

function getBadgeIcon(acao) {
    const icons = {
        'criar': 'plus',
        'editar': 'edit',
        'excluir': 'trash',
        'login': 'sign-in-alt',
        'config': 'cog',
        'configurar': 'cog',
        'perfil': 'user'
    };
    return icons[(acao || '').toLowerCase()] || 'info';
}

function getAvatarColor(modulo) {
    const colors = {
        'vendas': '#3498db, #2980b9',
        'compras': '#2ecc71, #27ae60',
        'pcp': '#f39c12, #e67e22',
        'financeiro': '#9b59b6, #8e44ad',
        'rh': '#1abc9c, #16a085',
        'nfe': '#e74c3c, #c0392b',
        'sistema': '#34495e, #2c3e50'
    };
    return colors[(modulo || '').toLowerCase()] || '#95a5a6, #7f8c8d';
}

function capitalizar(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatarDataHora(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function registrarAuditFrontend(acao, modulo, descricao) {
    fetch('/api/audit-log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
            usuario: localStorage.getItem('userName') || 'Usuário',
            acao,
            modulo,
            descricao
        })
    }).catch(err => console.error('Erro ao registrar audit:', err));
}

// Toast notification helper
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success'  'check-circle' : type === 'error'  'times-circle' : 'info-circle'}"></i> ${message}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; 
        background: ${type === 'success'  '#27ae60' : type === 'error'  '#e74c3c' : '#3498db'}; 
        color: white; border-radius: 8px; z-index: 99999; animation: slideIn 0.3s ease;
        box-shaçãow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Exportar novas funções
window.loadFuncionariosData = loadFuncionariosData;
window.carregarFuncionariosCompleto = carregarFuncionariosCompleto;
window.abrirModalNovoFuncionario = abrirModalNovoFuncionario;
window.editarFuncionario = editarFuncionario;
window.salvarFuncionario = salvarFuncionario;
window.excluirFuncionario = excluirFuncionario;
window.verDetalhesFuncionario = verDetalhesFuncionario;
window.importarFuncionarios = importarFuncionarios;
window.exportarFuncionarios = exportarFuncionarios;
window.processarArquivoImportacao = processarArquivoImportacao;
window.baixarModeloImportacao = baixarModeloImportacao;
window.buscarFuncionarios = buscarFuncionarios;
window.filtrarFuncionariosPorStatus = filtrarFuncionariosPorStatus;
window.carregarHistoricoAlteracoes = carregarHistoricoAlteracoes;
window.filtrarHistorico = filtrarHistorico;
window.exportarHistorico = exportarHistorico;
window.showToast = showToast;
window.loadCargosData = loadCargosData;
window.loadFolhaPagamentoData = loadFolhaPagamentoData;
window.loadPontoEletronicoData = loadPontoEletronicoData;
window.loadPlanoContasData = loadPlanoContasData;
window.loadContasBancariasData = loadContasBancariasData;
window.loadFormasPagamentoData = loadFormasPagamentoData;
window.loadImpostosData = loadImpostosData;
window.loadGruposClientesData = loadGruposClientesData;
window.loadRegioesVendaData = loadRegioesVendaData;
window.loadTiposFornecedorData = loadTiposFornecedorData;
window.loadCondicoesPagamentoData = loadCondicoesPagamentoData;
window.loadTabelasPrecoData = loadTabelasPrecoData;
window.loadUnidadesMedidaData = loadUnidadesMedidaData;
window.loadNCMData = loadNCMData;
window.loadTiposServicoData = loadTiposServicoData;
window.loadContratosData = loadContratosData;
window.loadSLAData = loadSLAData;
window.loadNFSeData = loadNFSeData;
window.formatMoney = formatMoney;