// Chat desativação globalmente. Mantém API no-op para evitar erros.
(function() {
	'use strict';

	const noop = () => {};
	const api = {
		toggle: noop,
		close: noop,
		sendMessage: noop,
		showNotification: noop,
		updateNotificationBadge: noop,
		selectOption: noop,
		contactSupport: noop
	};

	if (typeof window !== 'undefined') {
		window.ChatWidget = api;
		window.chatWidgetDisabled = true;
		console.warn('Chat widget desativação.');
	}
})();
