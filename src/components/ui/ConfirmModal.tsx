import { Text } from '@chakra-ui/react';
import { useBudgetStore } from '../../store/budgetStore';
import { DialogModal } from './DialogModal';

export default function ConfirmModal() {

  const isOpen = useBudgetStore((s) => s.isConfirmModalOpen);
  const closeConfirmModal = useBudgetStore((s) => s.closeConfirmModal);
  const setConfirmModalOpen = useBudgetStore((s) => s.setConfirmModalOpen);
  const config = useBudgetStore((s) => s.confirmModalConfig);
  const clearQueue = useBudgetStore((s) => s.clearSavingsReviewQueue);
  const resolveSavingsLink = useBudgetStore((s) => s.resolveSavingsLink);

  const handleClose = () => {
    // If a caller used legacy setConfirmModalOpen(true), config is null.
    // Either way, closing should fully reset the modal state.
    closeConfirmModal();
  };

  const handleSubmit = () => {
    if (config && typeof config.onAccept === "function") {
      try {
        config.onAccept();
      } finally {
        closeConfirmModal();
      }
      return;
    }

    // Legacy behavior: used by SavingsReviewModal.
    setConfirmModalOpen(false);
    clearQueue();
    resolveSavingsLink(false);
  };

  const handleCancel = () => {
    if (config && typeof config.onCancel === "function") {
      try {
        config.onCancel();
      } finally {
        closeConfirmModal();
      }
      return;
    }
    handleClose();
  };

  const title = config?.title ?? "Confirm Cancel Process";
  const message = config?.message ?? "Exiting this window will cancel all pending actions.\nAre you sure you wish to proceed?";
  const lines = String(message).split(/\n+/g).map((s) => s.trim()).filter(Boolean);

  return (
    <DialogModal
      title={title}
      open={isOpen}
      setOpen={handleClose}
      initialFocus={config?.initialFocus ?? "cancel"}
      enterKeyAction={config?.enterKeyAction ?? "cancel"}
      onAccept={handleSubmit}
      onCancel={handleCancel}
      acceptLabel={config?.acceptLabel}
      cancelLabel={config?.cancelLabel}
      acceptColorPalette={config?.acceptColorPalette}
      isDanger={config?.isDanger}
      body={
        <>
          {lines.map((line, idx) => (
            <Text key={idx}>{line}</Text>
          ))}
        </>
      }
    />
  );
}