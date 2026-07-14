/* Visual-only feedback bus. Audio is deliberately not wired here. */
export function createFeedbackBus(root = document) {
  const listeners = new Set();
  const history = [];

  function emit(type, detail = {}) {
    const event = {
      type,
      detail,
      at: Date.now(),
    };
    history.push(event);
    if (history.length > 30) history.shift();
    listeners.forEach((listener) => listener(event));
    root.dispatchEvent(new CustomEvent('spike:feedback', { detail: event }));
    return event;
  }

  return {
    emit,
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    recent() { return [...history]; },
  };
}
