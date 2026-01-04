// ============================================
// SISTEMA DE CACHE OTIMIZADO PARA APIs
// ============================================

class APICache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxAge = options.maxAge || 5 * 60 * 1000; // 5 minutos padrão
        this.maxSize = options.maxSize || 100; // 100 entradas máximo
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Gera chave única para a requisição
     */
    _generateKey(url, options = {}) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
    }

    /**
     * Verifica se item está no cache e ainda é válido
     */
    get(url, options = {}) {
        const key = this._generateKey(url, options);
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return null;
        }

        // Verifica se expirou
        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        console.log(`[CACHE HIT] ${url} (${this.stats.hits}/${this.stats.hits + this.stats.misses})`);
        return item.data;
    }

    /**
     * Armazena daçãos no cache
     */
    set(url, data, options = {}) {
        const key = this._generateKey(url, options);

        // Se atingiu o limite, remove a entrada mais antiga
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });

        console.log(`[CACHE SET] ${url} (size: ${this.cache.size}/${this.maxSize})`);
    }

    /**
     * Remove entrada específica do cache
     */
    invalidate(url, options = {}) {
        const key = this._generateKey(url, options);
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`[CACHE INVALIDATE] ${url}`);
        }
        return deleted;
    }

    /**
     * Limpa todo o cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[CACHE CLEAR] ${size} entradas removidas`);
    }

    /**
     * Retorna estatísticas do cache
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0  ((this.stats.hits / total) * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Fetch com cache automático
     */
    async fetch(url, options = {}) {
        // Verifica cache primeiro
        const cached = this.get(url, options);
        if (cached !== null) {
            return cached;
        }

        try {
            // Faz requisição
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Armazena no cache apenas se for GET
            if (!options.method || options.method.toUpperCase() === 'GET') {
                this.set(url, data, options);
            }

            return data;

        } catch (error) {
            console.error(`[CACHE FETCH ERROR] ${url}:`, error);
            throw error;
        }
    }
}

// ============================================
// INSTÂNCIA GLOBAL DO CACHE
// ============================================

window.apiCache = new APICache({
    maxAge: 5 * 60 * 1000,  // 5 minutos
    maxSize: 100            // 100 entradas
});

// ============================================
// WRAPPER DE FETCH COM CACHE
// ============================================

/**
 * Fetch com cache automático
 * @param {string} url - URL da API
 * @param {Object} options - Opções do fetch
 * @param {boolean} useCache - Usar cache (padrão: true)
 */
window.fetchWithCache = async function(url, options = {}, useCache = true) {
    if (useCache) {
        return await window.apiCache.fetch(url, options);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
};

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

/**
 * Invalida cache de uma URL específica
 */
window.invalidateCache = function(url, options = {}) {
    return window.apiCache.invalidate(url, options);
};

/**
 * Limpa todo o cache
 */
window.clearCache = function() {
    window.apiCache.clear();
};

/**
 * Mostra estatísticas do cache
 */
window.showCacheStats = function() {
    const stats = window.apiCache.getStats();
    console.table(stats);
    return stats;
};

// ============================================
// AUTO-LIMPEZA PERIÓDICA
// ============================================

// Limpa cache a cada 10 minutos
setInterval(() => {
    console.log('[CACHE] Limpeza periódica...');
    const stats = window.apiCache.getStats();
    console.log(`[CACHE] Antes: ${stats.size} entradas`);
    
    // Remove entradas expiradas
    const now = Date.now();
    for (const [key, value] of window.apiCache.cache.entries()) {
        if (now - value.timestamp > window.apiCache.maxAge) {
            window.apiCache.cache.delete(key);
        }
    }
    
    const newStats = window.apiCache.getStats();
    console.log(`[CACHE] Depois: ${newStats.size} entradas`);
}, 10 * 60 * 1000);

console.log('✅ Sistema de cache carregação');
console.log('📊 Use window.showCacheStats() para ver estatísticas');
