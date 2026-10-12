let activeRequests = 0;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(activeRequests));
};

export const beginGlobalLoading = (config = {}) => {
  if (config.skipGlobalLoading || config.__globalLoadingActive) return config;
  config.__globalLoadingActive = true;
  activeRequests += 1;
  notify();
  return config;
};

export const endGlobalLoading = (config) => {
  if (!config?.__globalLoadingActive) return;
  delete config.__globalLoadingActive;
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
};

export const subscribeGlobalLoading = (listener) => {
  listeners.add(listener);
  listener(activeRequests);
  return () => listeners.delete(listener);
};

export const getActiveRequestCount = () => activeRequests;
