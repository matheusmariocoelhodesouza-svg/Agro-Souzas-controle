(() => {
  'use strict';
  const update = () => {
    const link = document.getElementById('scanProLabLink');
    if (!link) return;
    const vehicle = window.O360Workspace?.vehicle();
    link.href = './scan-pro/index.html' + (vehicle?.id ? '?vehicle=' + encodeURIComponent(vehicle.id) : '');
  };
  document.addEventListener('o360:vehicle-changed', () => queueMicrotask(update));
  document.addEventListener('DOMContentLoaded', update);
  update();
})();
