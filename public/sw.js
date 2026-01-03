// Service Worker para Aluforce PWA
// Versão: 1.0.0

const CACHE_VERSION = 'aluforce-v1.0.24';
const CACHE_NAME = `aluforce-cache-${CACHE_VERSION}`;

// Assets críticos para cache (funcionamento offline básico)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/greeting-premium.css',
  '/css/cards-solid.css',
  '/css/preferences-modal.css',
  '/css/modal-configuracoes.css',
  '/css/omie-settings.css',
  '/js/app.js',
  '/js/auth.js',
  '/manifest.json'
];

// Assets dos módulos principais
const MODULE_ASSETS = [
  '/modules/Compras/index.html',
  '/modules/Vendas/index.html',
  '/modules/PCP/index.html',
  '/modules/NFe/index.html',
  '/modules/Financeiro/index.html',
  '/modules/RH/index.html'
];

// Evento de instalação - cachear assets críticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker versão', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto, adicionando assets críticos');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets críticos cacheados com sucesso');
        return self.skipWaiting(); // Ativa imediatamente
      })
      .catch((error) => {
        console.error('[SW] Erro ao cachear assets:', error);
      })
  );
});

// Evento de ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker versão', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('aluforce-cache-') && cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker ativado e pronto');
        return self.clients.claim(); // Assume controle de todas as páginas
      })
  );
});

// Estratégia de cache: Network First com fallback para Cache
// Ideal para app que precisa de dados sempre atualizados
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de outros domínios (ex: CDNs)
  if (url.origin !== location.origin) {
    return;
  }

  // Ignora requisições de API (sempre buscar dados frescos)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Se API falhar, retorna resposta offline
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'Conecte-se à internet para acessar esta funcionalidade' 
            }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        })
    );
    return;
  }

  // Para outros recursos: Network First com Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone a resposta para cachear e retornar
        const responseClone = response.clone();
        
        // Só cacheia respostas OK
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Se network falhar, busca no cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Servindo do cache:', request.url);
              return cachedResponse;
            }
            
            // Se não está no cache, retorna página offline
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Para outros recursos, retorna erro genérico
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Evento de mensagem - para comunicação com a página
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_MODULES') {
    // Cachear módulos sob demanda
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(MODULE_ASSETS);
      })
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        console.error('[SW] Erro ao cachear módulos:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

// Notificar quando há atualização disponível
self.addEventListener('updatefound', () => {
  console.log('[SW] Atualização do Service Worker encontrada!');
});

console.log('[SW] Service Worker carregado - versão', CACHE_VERSION);
