/* CONTROLADOR DE ANIMAÇÕES AVANÇADAS - ESTILO PCP */

class MenuAnimationController {
    constructor() {
        this.init();
        this.bindEvents();
        this.setupRippleEffect();
        this.setupSectionTransitions();
    }

    init() {
        // Adicionar classes de animação aos elementos
        this.addAnimationClasses();
        
        // Setup do observer para animações de entrada
        this.setupIntersectionObserver();
        
        // Preload das seções para transições suaves
        this.preloadSections();
    }

    addAnimationClasses() {
        // Adicionar classes para animações
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('animated-sidebar');
        }

        const widgets = document.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            widget.style.animationDelay = `${0.1 + (index * 0.1)}s`;
        });
    }

    bindEvents() {
        // Event listeners para navegação com animação
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e, link);
            });

            // Hover effects
            link.addEventListener('mouseenter', () => {
                this.handleNavHover(link);
            });

            link.addEventListener('mouseleave', () => {
                this.handleNavLeave(link);
            });
        });

        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    handleNavClick(e, link) {
        // Prevent default navigation
        e.preventDefault();
        
        // Adicionar efeito ripple
        this.createRippleEffect(link, e);
        
        // Animar saída da seção atual
        const currentSection = document.querySelector('.content-section.active');
        if (currentSection) {
            this.animateOut(currentSection).then(() => {
                // Navegar para nova seção
                const sectionId = link.getAttribute('href').substring(1);
                this.navigateToSection(sectionId, link);
            });
        } else {
            // Navegação direta se não há seção ativa
            const sectionId = link.getAttribute('href').substring(1);
            this.navigateToSection(sectionId, link);
        }
    }

    handleNavHover(link) {
        // Micro-animação no hover com expansão
        const icon = link.querySelector('i');
        if (icon) {
            icon.style.transform = 'scale(1.2)';
            icon.style.color = 'white';
        }

        // Adicionar efeito de expansão ao link
        link.style.transform = 'scale(1.15)';
        
        // Efeito de brilho
        link.style.filter = 'brightness(1.1)';
        
        // Som de hover simulação (vibração muito leve)
        if ('vibrate' in navigator) {
            navigator.vibrate(5);
        }

        // Adicionar classe para animações CSS
        link.classList.add('menu-hover-active');
    }

    handleNavLeave(link) {
        const icon = link.querySelector('i');
        
        if (!link.classList.contains('active')) {
            if (icon) {
                icon.style.transform = 'scale(1)';
                icon.style.color = '';
            }
            link.style.transform = 'scale(1)';
            link.style.filter = '';
        } else {
            // Manter estação ativo
            if (icon) {
                icon.style.transform = 'scale(1.15)';
                icon.style.color = 'white';
            }
            link.style.transform = 'scale(1.1)';
        }
        
        // Remover classe de hover
        link.classList.remove('menu-hover-active');
    }

    createRippleEffect(element, event) {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            background: rgba(78, 115, 223, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupRippleEffect() {
        // Adicionar CSS para animação ripple
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple-animation {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    animateOut(section) {
        return new Promise((resolve) => {
            section.style.transform = 'translateX(-30px)';
            section.style.opacity = '0';
            
            setTimeout(() => {
                section.classList.remove('active');
                section.style.display = 'none';
                resolve();
            }, 200);
        });
    }

    navigateToSection(sectionId, link) {
        // Remover active de todos os links
        document.querySelectorAll('.sidebar-nav a').forEach(l => {
            l.classList.remove('active');
            const icon = l.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });

        // Adicionar active ao link clicação
        link.classList.add('active');
        const activeIcon = link.querySelector('i');
        if (activeIcon) {
            activeIcon.style.transform = 'scale(1.1)';
        }

        // Mostrar nova seção com animação
        const newSection = document.getElementById(sectionId);
        if (newSection) {
            this.animateIn(newSection);
            
            // Chamar função de navegação original se existir
            if (window.omieLayout && window.omieLayout.navigateToSection) {
                setTimeout(() => {
                    window.omieLayout.navigateToSection(sectionId);
                }, 100);
            }
        }
    }

    animateIn(section) {
        section.style.display = 'block';
        section.style.transform = 'translateX(30px)';
        section.style.opacity = '0';
        
        // Force reflow
        section.offsetHeight;
        
        section.classList.add('active');
        section.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        section.style.transform = 'translateX(0)';
        section.style.opacity = '1';

        // Animar widgets se existirem
        const widgets = section.querySelectorAll('.widget');
        widgets.forEach((widget, index) => {
            widget.style.opacity = '0';
            widget.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                widget.style.transition = 'all 0.4s ease';
                widget.style.opacity = '1';
                widget.style.transform = 'translateY(0)';
            }, 100 + (index * 100));
        });
    }

    setupSectionTransitions() {
        // Loading states para seções
        document.querySelectorAll('.content-section').forEach(section => {
            section.addEventListener('beforeShow', () => {
                section.classList.add('loading');
            });

            section.addEventListener('afterShow', () => {
                setTimeout(() => {
                    section.classList.remove('loading');
                }, 500);
            });
        });
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        // Observar widgets e elementos animáveis
        document.querySelectorAll('.widget, .table-container, .section-header').forEach(el => {
            observer.observe(el);
        });
    }

    preloadSections() {
        // Pre-carregar seções para navegação instantânea
        const sections = ['estoque-section', 'vendas-section', 'relatórios-section'];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                // Preload básico
                section.style.opacity = '0';
                section.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    section.style.opacity = '';
                    section.style.pointerEvents = '';
                }, 100);
            }
        });
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const body = document.body;
        
        if (sidebar) {
            sidebar.classList.toggle('mobile-active');
            body.classList.toggle('mobile-menu-open');
            
            // Animação do ícone hamburger se existir
            const hamburger = document.querySelector('.mobile-menu-toggle');
            if (hamburger) {
                hamburger.classList.toggle('active');
            }
        }
    }

    simulateHapticFeedback() {
        // Simular feedback háptico com vibração (se suportação)
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }

    // Método público para adicionar nova seção com animação
    addSection(sectionId, element) {
        element.classList.add('content-section');
        element.style.opacity = '0';
        element.style.transform = 'translateY(50px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100);
    }

    // Método para animar elementos específicos
    animateElement(element, animation = 'fadeInUp', delay = 0) {
        element.style.opacity = '0';
        element.style.transform = this.getAnimationTransform(animation);
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0) scale(1)';
        }, delay);
    }

    getAnimationTransform(animation) {
        const animations = {
            'fadeInUp': 'translateY(30px)',
            'fadeInDown': 'translateY(-30px)',
            'fadeInLeft': 'translateX(-30px)',
            'fadeInRight': 'translateX(30px)',
            'zoomIn': 'scale(0.8)',
            'zoomOut': 'scale(1.2)'
        };
        
        return animations[animation] || 'translateY(30px)';
    }
}

// Auto-inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.menuAnimations = new MenuAnimationController();
    console.log('🎨 Menu Animation Controller initialized');
});

// Expor globalmente para integração
window.MenuAnimationController = MenuAnimationController;