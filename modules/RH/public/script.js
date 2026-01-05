/**
 * Script unificação para o Portal do Funcionário e para a Área Administrativa.
 * * O código detecta em qual página está (admin ou funcionário) e inicializa
 * apenas as funcionalidades relevantes para evitar conflitos.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Verifica se estamos na página do Admin (procurando a tabela de funcionários)
  const isAdminPage = document.getElementById('tabela-funcionarios')

  // Verifica se estamos na página do Funcionário (procurando a mensagem de boas-vindas)
  const isEmployeePage = document.getElementById('welcome-message')

  if (isAdminPage) {
    console.log('Inicializando a Área do Administraçãor...')
    initAdminPage()
  } else if (isEmployeePage) {
    console.log('Inicializando o Portal do Funcionário...')
    initEmployeePage()
  } else {
    console.warn('Nenhum contexto (Admin ou Funcionário) detectado. O script não foi totalmente inicialização.')
  }
})

// Helper: cria headers com Authorization se token existir
function getAuthHeaders (additional = {}) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token')
  const headers = Object.assign({}, additional || {})
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// ===================================================================================
// == FUNÇÁO PARA CARREGAR PÁGINAS SEPARADAS
// ===================================================================================
function loadPage(pageName) {
  console.log(`Carregando página: ${pageName}`)
  
  // Atualizar menu ativo
  updateActiveMenu(pageName)
  
  // Define o contêiner principal onde a página será carregada
  const mainContent = document.querySelector('.content-area') || document.querySelector('main') || document.querySelector('.main-content')
  
  if (!mainContent) {
    console.error('Contêiner principal não encontrado para carregar a página')
    if (window.headerControls) {
      window.headerControls.showToast('Erro: Contêiner não encontrado', 'error')
    }
    return
  }

  // Log de carregamento (sem notificação)
  console.log(`🔄 Carregando ${getPageDisplayName(pageName)}...`)

  // Mostra indicaçãor de carregamento
  mainContent.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 400px; flex-direction: column;">
      <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 20px; color: #666; font-size: 16px;">Carregando ${getPageDisplayName(pageName)}...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `

  // Carrega a página
  fetch(`pages/${pageName}.html`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erro ao carregar página: ${response.status}`)
      }
      return response.text()
    })
    .then(html => {
      // Remove a estrutura HTML completa e pega apenas o body
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      
      // Verificar se existe body, senão usar o conteúdo completo
      const bodyElement = tempDiv.querySelector('body')
      const pageContent = bodyElement ? bodyElement.innerHTML : html
      
      mainContent.innerHTML = pageContent
      
      // Executa scripts da página carregada
      const scripts = tempDiv.querySelectorAll('script')
      scripts.forEach(script => {
        const newScript = document.createElement('script')
        if (script.src) {
          newScript.src = script.src
        } else {
          newScript.textContent = script.textContent
        }
        document.head.appendChild(newScript)
      })
      
      console.log(`Página ${pageName} carregada com sucesso`)
      
      // Log de sucesso (sem notificação)
      console.log(`✅ ${getPageDisplayName(pageName)} carregação`)
      
      // Aplicar visualização atual (grid/list)
      if (window.headerControls && window.headerControls.currentView) {
        setTimeout(() => {
          if (window.headerControls.currentView === 'grid') {
            window.headerControls.switchToGridView()
          } else {
            window.headerControls.switchToListView()
          }
        }, 100)
      }
    })
    .catch(error => {
      console.error('Erro ao carregar página:', error)
      
      // Log de erro (sem notificação)
      console.error(`❌ Erro ao carregar ${getPageDisplayName(pageName)}`)
      
      mainContent.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
          <h3><i class="fas fa-exclamation-triangle"></i> Erro ao carregar página</h3>
          <p>Não foi possível carregar a página "${getPageDisplayName(pageName)}".</p>
          <p style="font-size: 14px; color: #666; margin: 20px 0;">Erro: ${error.message}</p>
          <button onclick="loadPage('${pageName}')" style="margin: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-redo"></i> Tentar Novamente
          </button>
          <button onclick="loadPage('dashboard')" style="margin: 10px; padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-home"></i> Voltar ao Dashboard
          </button>
        </div>
      `
    })
}

// Atualizar menu ativo
function updateActiveMenu(pageName) {
  // Remove active de todos os links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active')
  })
  
  // Adiciona active no link correspondente
  const activeLink = document.querySelector(`[onclick*="loadPage('${pageName}')"]`)
  if (activeLink) {
    activeLink.classList.add('active')
  }
}

// Obter nome de exibição da página
function getPageDisplayName(pageName) {
  const names = {
    dashboard: 'Dashboard',
    funcionarios: 'Funcionários', 
    holerites: 'Holerites',
    relatórios: 'Relatórios'
  }
  return names[pageName] || pageName
}

// ===================================================================================
// == INÍCIO - LÓGICA DA ÁREA DO ADMINISTRADOR
// ===================================================================================
function initAdminPage () {
  const API_URL = 'http://localhost:3000/api/funcionarios'
  const tabelaCorpo = document.querySelector('#tabela-funcionarios tbody')
  const formNovoFuncionario = document.getElementById('form-novo-funcionario')
  const modal = document.getElementById('modal-detalhes')
  const closeModalButton = document.querySelector('.close-button')
  let currentFuncionarioId = null

  // --- LÓGICA PARA NAVEGAÇÁO DO MENU (ADMIN) ---
  const navLinks = document.querySelectorAll('.nav-link')
  const contentSections = document.querySelectorAll('.content-section')

  navLinks.forEach(link => {
    if (link.classList.contains('logout')) return // Ignora o link de logout

    link.addEventListener('click', (e) => {
      e.preventDefault()
      const targetId = link.getAttribute('href').substring(1)
      const targetSection = document.getElementById(targetId)

      contentSections.forEach(section => section.classList.remove('active'))
      navLinks.forEach(navLink => navLink.classList.remove('active'))

      if (targetSection) {
        targetSection.classList.add('active')
        link.classList.add('active')
      }
    })
  })

  // --- FUNÇÕES DA API (ADMIN) ---

  async function carregarFuncionarios () {
    try {
      const response = await fetch(API_URL, { headers: getAuthHeaders({ 'Content-Type': 'application/json' }) })
      if (!response.ok) throw new Error('Erro ao buscar dados da API.')
      const funcionarios = await response.json()

      tabelaCorpo.innerHTML = ''
      if (funcionarios.length === 0) {
        tabelaCorpo.innerHTML = '<tr><td colspan="5">Nenhum funcionário cadastração.</td></tr>'
        return
      }

      funcionarios.forEach(func => {
        const tr = document.createElement('tr')
        tr.innerHTML = `
                    <td>${func.id}</td>
                    <td>${func.nome}</td>
                    <td>${func.cargo}</td>
                    <td>${func.email}</td>
                    <td><button class="btn btn-detalhes" data-id="${func.id}">Detalhes</button></td>
                `
        tabelaCorpo.appendChild(tr)
      })
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
      tabelaCorpo.innerHTML = '<tr><td colspan="5" style="color: red;">Não foi possível carregar os dados. Verifique se a API está online.</td></tr>'
    }
  }

  async function cadastrarFuncionario (event) {
    event.preventDefault()
    const novoFuncionario = {
      nome: document.getElementById('nome').value,
      cargo: document.getElementById('cargo').value,
      email: document.getElementById('email').value,
      dataAdmissao: document.getElementById('data-admissao').value
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(novoFuncionario)
      })
      if (!response.ok) throw new Error('Erro ao cadastrar funcionário.')
      showToast('Funcionário cadastração com sucesso!', 'success')
      formNovoFuncionario.reset()
      carregarFuncionarios()
      document.querySelector('.nav-link[href="#dashboard-section"]').click() // Volta para a dashboard
    } catch (error) {
      showToast('Falha ao cadastrar: ' + error.message, 'error')
    }
  }

  async function uploadArquivo (tipoArquivo, inputFileId) {
    const inputFile = document.getElementById(inputFileId)
    if (inputFile.files.length === 0) {
      showToast('Por favor, selecione um arquivo.', 'error')
      return
    }
    const formData = new FormData()
    formData.append('arquivo', inputFile.files[0])
    try {
      const response = await fetch(`${API_URL}/${currentFuncionarioId}/${tipoArquivo}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })
      if (!response.ok) throw new Error('Falha no upload do arquivo.')
      showToast('Arquivo enviação com sucesso!', 'success')
      inputFile.value = '' // Limpa o input
      abrirModalDetalhes(currentFuncionarioId) // Recarrega os detalhes do modal
    } catch (error) {
      showToast(`Erro ao enviar o arquivo: ${error.message}`, 'error')
    }
  }

  async function abrirModalDetalhes (id) {
    currentFuncionarioId = id
    const detalhesContent = document.getElementById('detalhes-funcionario-content')
    detalhesContent.innerHTML = '<p>Carregando...</p>'
    // use centralized helper to open modal (adds .open, sets display and traps focus)
    if (typeof openModal === 'function') openModal(modal)
    else {
      if (typeof openModal === 'function') openModal(modal)
      else {
        modal.classList.add('open')
        modal.style.display = 'flex'
        document.body.classList.add('modal-open')
      }
    }
    try {
      const response = await fetch(`${API_URL}/${id}`, { headers: getAuthHeaders({ 'Content-Type': 'application/json' }) })
      if (!response.ok) throw new Error('Não foi possível buscar os detalhes do funcionário.')
      const func = await response.json()

      const dataAdmissao = func.data_admissao  new Date(func.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'
      const atéstaçãos = func.atéstaçãos && func.atéstaçãos.length > 0 ? func.atéstaçãos.map(a => `<li>${a}</li>`).join('') : '<li>Nenhum atéstação registração.</li>'
      const holerites = func.holerites && func.holerites.length > 0 ? func.holerites.map(h => `<li>${h}</li>`).join('') : '<li>Nenhum holerite registração.</li>'

      detalhesContent.innerHTML = `
                <p><strong>ID:</strong> ${func.id}</p>
                <p><strong>Nome:</strong> ${func.nome}</p>
                <p><strong>Email:</strong> ${func.email}</p>
                <p><strong>Cargo:</strong> ${func.cargo}</p>
                <p><strong>Admissão:</strong> ${dataAdmissao}</p>
                <hr><h4>Atéstaçãos:</h4><ul>${atéstaçãos}</ul>
                <h4>Holerites:</h4><ul>${holerites}</ul>`
    } catch (error) {
      detalhesContent.innerHTML = `<p style="color: red;">${error.message}</p>`
    }
  }

  function fecharModal () {
    // use centralized helper to close modal (removes .open, restores focus)
    if (typeof closeModal === 'function') closeModal(modal)
    else {
      modal.classList.remove('open')
      modal.style.display = 'none'
      if (!document.querySelector('.modal.open')) document.body.classList.remove('modal-open')
    }
  }

  // --- EVENT LISTENERS (ADMIN) ---
  if (formNovoFuncionario) formNovoFuncionario.addEventListener('submit', cadastrarFuncionario)

  tabelaCorpo.addEventListener('click', e => {
    if (e.target.classList.contains('btn-detalhes')) {
      abrirModalDetalhes(e.target.dataset.id)
    }
  })

  document.getElementById('btn-upload-holerite').addEventListener('click', () => uploadArquivo('holerite', 'arquivo-holerite'))
  document.getElementById('btn-upload-atéstação').addEventListener('click', () => uploadArquivo('atéstação', 'arquivo-atéstação'))

  if (closeModalButton) closeModalButton.addEventListener('click', fecharModal)
  window.addEventListener('click', e => { if (e.target === modal) fecharModal() })

  // Carga inicial
  carregarFuncionarios()
}
// ===================================================================================
// == FIM - LÓGICA DA ÁREA DO ADMINISTRADOR
// ===================================================================================

// ===================================================================================
// == INÍCIO - LÓGICA DO PORTAL DO FUNCIONÁRIO
// ===================================================================================
function initEmployeePage () {
  // --- LÓGICA DE AUTENTICAÇÁO E DADOS DO USUÁRIO ---

  console.log('🔍 SCRIPT.JS initEmployeePage: Iniciando verificações...')

  // Tenta obter os dados do localStorage. Em um sistema real, isso viria de uma API.
  const authToken = localStorage.getItem('authToken')
  let userData = null
  try {
    userData = JSON.parse(localStorage.getItem('userData'))
    console.log('🔍 SCRIPT.JS: UserData carregação:', {
      hasUserData: !!userData,
      id: userData.id,
      nome: userData.nome,
      nome_completo: userData.nome_completo,
      email: userData.email,
      role: userData.role
    })
  } catch {
    // Se os dados estiverem corrompidos, trata como nulos
    console.log('❌ SCRIPT.JS: Daçãos corrompidos no localStorage')
    userData = null
  }

  // Se não houver token ou dados de usuário, redireciona para o login
  if (!authToken || !userData || (!userData.nome && !userData.nome_completo && !userData.email)) {
    // Usuário não autenticação - redireciona para a página de login
    console.warn('Usuário não autenticação. Redirecionando para login.', {
      hasToken: !!authToken,
      hasUserData: !!userData,
      userData: userData
    })
    if (typeof safeRedirectToLogin === 'function') safeRedirectToLogin(); else window.location.href = '/login.html'
    return // Para a execução
  }

  // --- PREENCHIMENTO DOS DADOS NA PÁGINA ---

  function populateUserData (data) {
    // Usar nome_completo, nome ou email como fallback
    const displayName = data.nome_completo || data.nome || data.email || 'Usuário'
    
    const welcomeEl = document.getElementById('welcome-message')
    if (welcomeEl) welcomeEl.textContent = `Bem-vindo(a), ${displayName}`
    
    const lastLoginEl = document.getElementById('last-login')
    if (lastLoginEl) lastLoginEl.textContent = new Date().toLocaleString('pt-BR')

    const fields = {
      nome_completo: data.nome_completo || data.nome,
      data_nascimento: data.data_nascimento || data.dataNascimento,
      cpf: data.cpf,
      rg: data.rg,
      endereco: data.endereco,
      telefone: data.telefone,
      email: data.email,
      estação_civil: data.estaçãoCivil,
      dependentes: data.dependentes || 0,
      data_admissao: data.dataAdmissao
    }

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) element.value = value || ''
    })

    document.getElementById('banco').textContent = data.banco || 'Não informação'
    document.getElementById('agencia').textContent = data.agencia || 'Não informação'
    document.getElementById('conta_corrente').textContent = data.conta || 'Não informação'
  }

  // --- FUNÇÕES DE EVENTOS (FUNCIONÁRIO) ---

  function setupEventListeners () {
    // Menu toggle para mobile
    const menuToggle = document.getElementById('menu-toggle')
    if (menuToggle) menuToggle.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'))

    // Navegação principal
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link, .widget-link')
    navLinks.forEach(link => link.addEventListener('click', handleNavLinkClick))

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout)

    // Edição de dados
    document.getElementById('edit-btn').addEventListener('click', enableFormEditing)
    document.getElementById('dados-form').addEventListener('submit', handleFormSubmit)

    // Holerite e Ponto
    document.getElementById('view-holerite').addEventListener('click', loadHolerite)
    document.getElementById('view-ponto').addEventListener('click', loadPonto)

    // Atéstação
    document.getElementById('atéstação-form').addEventListener('submit', handleAtestaçãoSubmit)
  }

  function handleNavLinkClick (e) {
    e.preventDefault()
    const targetId = e.currentTarget.getAttribute('href').substring(1)

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'))

    document.getElementById(targetId).classList.add('active')
    document.querySelector(`.sidebar-nav .nav-link[href="#${targetId}"]`).classList.add('active')
  }

  function handleLogout (e) {
    e.preventDefault()
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    showToast('Você foi desconectação.', 'success')
    window.location.href = '/login.html'
  }

  function enableFormEditing () {
    ['telefone', 'estação_civil', 'dependentes'].forEach(id => {
      document.getElementById(id).disabled = false
    })
    document.getElementById('edit-btn').style.display = 'none'
    document.getElementById('save-btn').style.display = 'inline-block'
  }

  function handleFormSubmit (e) {
    e.preventDefault()
    // Simulação de salvamento
    showToast('Daçãos salvos com sucesso! (Simulação)', 'success');
    ['telefone', 'estação_civil', 'dependentes'].forEach(id => {
      document.getElementById(id).disabled = true
    })
    document.getElementById('edit-btn').style.display = 'inline-block'
    document.getElementById('save-btn').style.display = 'none'
  }

  function loadHolerite () {
    const mes = document.getElementById('holerite-mes').value
    const viewer = document.getElementById('holerite-viewer')
    viewer.innerHTML = `<p class="loading">Carregando holerite de ${mes}...</p>
                            <iframe src="holerite_simulação.pdf" style="width:100%; height:500px;" title="Visualizaçãor de Holerite"></iframe>`
  }

  function loadPonto () {
    const período = document.getElementById('ponto-mes').options[document.getElementById('ponto-mes').selectedIndex].text
    const viewer = document.getElementById('ponto-viewer')
    viewer.innerHTML = `<p>Exibindo espelho de ponto para o período de ${período}.</p> 
                            `
  }

  function handleAtestaçãoSubmit (e) {
    e.preventDefault()
    const fileInput = document.getElementById('atéstação-file')
    const uploadStatus = document.getElementById('upload-status')
    if (fileInput.files.length > 0) {
      uploadStatus.textContent = 'Enviando...'
      uploadStatus.style.color = 'blue'
      // Simulação de upload
      setTimeout(() => {
        uploadStatus.textContent = 'Atéstação enviação com sucesso!'
        uploadStatus.style.color = 'green'
        e.target.reset()
      }, 1500)
    } else {
      uploadStatus.textContent = 'Por favor, selecione um arquivo.'
      uploadStatus.style.color = 'red'
    }
  }

  // --- INICIALIZAÇÁO (FUNCIONÁRIO) ---
  populateUserData(userData)
  setupEventListeners()
}

// Simulação de login removida em produção.
// ===================================================================================
// == FIM - LÓGICA DO PORTAL DO FUNCIONÁRIO
// ===================================================================================
