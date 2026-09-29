export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === 'lavador.comando360.com.br' && (url.pathname === '/' || url.pathname === '/index.html')) {
      url.pathname = '/lavador360.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    return env.ASSETS.fetch(request);
  }
};
