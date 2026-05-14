import { createRoot, Root } from 'react-dom/client';
import { RecordingModal } from './RecordingModal';
import type { PluginAPI } from '../registry';

let modalRoot: Root | null = null;
let modalContainer: HTMLDivElement | null = null;

export const openRecordingModal = (targetNodeId: string | null, pluginApi: PluginAPI) => {
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
  }
  if (!modalRoot) {
    modalRoot = createRoot(modalContainer);
  }

  const handleClose = () => {
    if (modalRoot) {
      modalRoot.unmount();
      modalRoot = null;
    }
    if (modalContainer && modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
      modalContainer = null;
    }
  };

  modalRoot.render(<RecordingModal targetNodeId={targetNodeId} onClose={handleClose} pluginApi={pluginApi} />);
};

export const unmountModal = () => {
  if (modalRoot) {
    modalRoot.unmount();
    modalRoot = null;
  }
  if (modalContainer && modalContainer.parentNode) {
    modalContainer.parentNode.removeChild(modalContainer);
    modalContainer = null;
  }
};
