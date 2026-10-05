Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
});
