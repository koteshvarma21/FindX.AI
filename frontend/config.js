window.FINDX_API_BASE = window.FINDX_API_BASE || 'http://localhost:5000/api';
window.FINDX_BACKEND_BASE = window.FINDX_API_BASE.replace(/\/api\/?$/, '');
window.resolveFindxAssetUrl = function (value) {
	if (!value) return '';
	if (/^https?:\/\//i.test(value)) return value;
	if (value.startsWith('/')) return `${window.FINDX_BACKEND_BASE}${value}`;
	return value;
};