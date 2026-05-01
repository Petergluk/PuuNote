export const isFullscreen = (doc: Document) => {
  return !!doc.fullscreenElement;
};

export const exitFullscreen = (doc: Document) => {
  if (doc.fullscreenElement) {
    return doc.exitFullscreen();
  }
};

export const requestFullscreen = (el: HTMLElement) => {
  return el.requestFullscreen();
};
