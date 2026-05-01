export const isFullscreen = (doc: Document) => {
  return !!doc.fullscreenElement;
};

export const exitFullscreen = (doc: Document) => {
  if (doc.fullscreenElement) {
    return doc.exitFullscreen();
  }
  return Promise.resolve();
};

export const requestFullscreen = (el: HTMLElement) => {
  return el.requestFullscreen();
};
