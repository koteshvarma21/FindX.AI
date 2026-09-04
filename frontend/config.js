window.FINDX_API_BASE = window.FINDX_API_BASE || 'http://localhost:5000/api';
window.FINDX_BACKEND_BASE = window.FINDX_API_BASE.replace(/\/api\/?$/, '');
window.clearFindxSession = function () {
	localStorage.removeItem('token');
	['findx-auth', 'findx-user-name', 'findx-user-email', 'findx-user-username', 'findx-search-mode', 'findx-item-name', 'findx-item-description', 'findx-original-image', 'findx-extracted-details', 'findx-final-description', 'findx-final-image', 'findx-generated-image-id', 'findx-image-confidence', 'findx-lost-item-id', 'findx-vision-warning'].forEach((key) => sessionStorage.removeItem(key));
};
window.resolveFindxAssetUrl = function (value) {
	if (!value) return '';
	if (/^https?:\/\//i.test(value)) return value;
	if (value.startsWith('/')) return `${window.FINDX_BACKEND_BASE}${value}`;
	return value;
};
const findxNativeFetch = window.fetch.bind(window);
window.fetch = async function (...args) {
	const response = await findxNativeFetch(...args);
	if (response.status === 401 || response.status === 403) window.clearFindxSession();
	return response;
};