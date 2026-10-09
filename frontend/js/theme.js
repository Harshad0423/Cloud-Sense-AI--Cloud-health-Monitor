// Runs before styles to restore the theme without a light-theme flash.
(() => {
  let theme = 'dark';
  try { theme = localStorage.getItem('cloudsense-theme') || theme; } catch (_) { /* Storage may be unavailable. */ }
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
})();
