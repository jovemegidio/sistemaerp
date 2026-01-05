// Script para forçar recarregamento das permissões
console.log('🔄 Forçando recarregamento de permissões...');

// Limpar cache
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
    });
}

// Recarregar email-permissions.js
const script = document.createElement('script');
script.src = '/js/email-permissions.jsv=' + Date.now();
script.onload = () => {
    console.log('✅ email-permissions.js recarregação');
    
    // Buscar dados do usuário e aplicar permissões
    fetch('/api/me', { credentials: 'include' })
        .then(r => r.json())
        .then(user => {
            console.log('👤 Usuário:', user.email);
            if (typeof applyModulePermissions === 'function') {
                applyModulePermissions(user);
            }
        });
};
document.head.appendChild(script);
