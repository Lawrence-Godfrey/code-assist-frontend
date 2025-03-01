export function getWebSocketUrl(path: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = process.env.NODE_ENV === 'production' ? window.location.port : '5005';
  return `${protocol}//${host}:${port}${path}`;
} 