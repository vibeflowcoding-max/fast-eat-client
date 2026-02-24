let isRouteLoading = false;

const listeners = new Set<(loading: boolean) => void>();

function notify() {
  for (const listener of listeners) {
    listener(isRouteLoading);
  }
}

export function startRouteLoading() {
  isRouteLoading = true;
  notify();
}

export function stopRouteLoading() {
  isRouteLoading = false;
  notify();
}

export function subscribeRouteLoading(listener: (loading: boolean) => void) {
  listeners.add(listener);
  listener(isRouteLoading);

  return () => {
    listeners.delete(listener);
  };
}
