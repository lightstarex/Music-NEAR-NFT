// Polyfills for Node.js globals in browser environment
(window as any).global = window;
(window as any).process = {
  env: {},
  browser: true,
  version: '',
}; 