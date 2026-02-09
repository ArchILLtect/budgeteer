import { Dialog, Button, Portal, CloseButton } from "@chakra-ui/react"
import { fireToast } from "../../hooks/useFireToast";

type DialogModalProps = {
  list?: { id: string; isFavorite: boolean };
  title: string;
  body: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  onAccept: (id?: string, isFavorite?: boolean) => void | Promise<void>;
  onCancel: () => void;
  isModal?: boolean;

  hideFooter?: boolean;
  hideCancelButton?: boolean;
  hideCloseButton?: boolean;

  acceptLabel?: string;
  cancelLabel?: string;
  acceptColorPalette?: string;
  acceptVariant?: React.ComponentProps<typeof Button>["variant"];
  cancelVariant?: React.ComponentProps<typeof Button>["variant"];
  acceptDisabled?: boolean;
  loading?: boolean;
  disableClose?: boolean;
  closeOnAccept?: boolean;
}

export const DialogModal = ({
  list,
  title,
  body,
  open,
  setOpen,
  onAccept,
  onCancel,
  acceptLabel,
  cancelLabel,
  acceptColorPalette,
  acceptVariant,
  cancelVariant,
  acceptDisabled,
  loading,
  disableClose,
  closeOnAccept,
  hideFooter,
  hideCancelButton,
  hideCloseButton,
} : DialogModalProps) => {

  const handleAccept = async () => {
    let didSucceed = false;
    try {
      if (list) {
        await onAccept(list.id, list.isFavorite);
      } else {
        await onAccept();
      }

      didSucceed = true;

    } catch (error) {
      console.error("Error in dialog accept action:", error);
      fireToast("error", "Error", "There was an issue processing your request.");
    }

    if (didSucceed && closeOnAccept !== false) {
      setOpen(false);
    }
  };

  const handleCancel = () => {
    if (loading || disableClose) return;
    try {
      onCancel();
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog.Root
      lazyMount
      open={open}
      closeOnEscape={!disableClose}
      closeOnInteractOutside={!disableClose}
      onOpenChange={(e) => {
        if (disableClose && !e.open) return;
        setOpen(e.open);
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header paddingX={4} paddingTop={4} paddingBottom={2}>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body paddingX={4} paddingY={2} >
              {body}
            </Dialog.Body>
            {hideFooter ? null : (
              <Dialog.Footer>
                {hideCancelButton ? null : (
                  <Dialog.ActionTrigger asChild>
                    <Button
                      variant={cancelVariant ?? "outline"}
                      onClick={handleCancel}
                      disabled={Boolean(loading) || Boolean(disableClose)}
                    >
                      {cancelLabel ?? "Cancel"}
                    </Button>
                  </Dialog.ActionTrigger>
                )}
                <Button
                  onClick={handleAccept}
                  colorPalette={acceptColorPalette}
                  variant={acceptVariant}
                  loading={loading}
                  disabled={Boolean(acceptDisabled) || Boolean(loading)}
                >
                  {acceptLabel ?? "Accept"}
                </Button>
              </Dialog.Footer>
            )}
            {hideCloseButton ? null : (
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close" onClick={handleCancel} disabled={Boolean(loading) || Boolean(disableClose)} />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}