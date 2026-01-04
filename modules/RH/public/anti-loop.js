// Anti-redirect loop protection
(function() {
    let redirectCount = 0;
    const maxRedirects = 3;
    const timeWindow = 5000; // 5 seconds
    let firstRedirect = null;
    
    const originalSetHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href').set;
    
    Object.defineProperty(Location.prototype, 'href', {
        set: function(url) {
            const now = Date.now();
            
            // Reset counter if time window passed
            if (firstRedirect && (now - firstRedirect > timeWindow)) {
                redirectCount = 0;
                firstRedirect = null;
            }
            
            // Track first redirect
            if (!firstRedirect) {
                firstRedirect = now;
            }
            
            redirectCount++;
            
            console.log(`🔄 Redirect #${redirectCount}:`, {
                from: window.location.href,
                to: url,
                count: redirectCount,
                maxAllowed: maxRedirects
            });
            
            // Prevent redirect loops
            if (redirectCount > maxRedirects) {
                console.error('🚨 REDIRECT LOOP DETECTED! Preventing redirect to:', url);
                alert(`ERRO: Loop de redirecionamento detectação!\n\nTentativa de ir para: ${url}\nContaçãor: ${redirectCount}/${maxRedirects}\n\nVerifique o console para mais detalhes.`);
                return;
            }
            
            return originalSetHref.call(this, url);
        }
    });
    
    console.log('🛡️ Anti-redirect loop protection ativação');
})();