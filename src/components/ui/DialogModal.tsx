import { Dialog, Button, Portal, CloseButton } from "@chakra-ui/react"
import { fireToast } from "../../hooks/useFireToast";
import { useEffect, useRef } from "react";

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

  // Quality-of-life: optional default focus and Enter-key behavior.
  // Accessibility: we only trigger on Enter when focus isn't inside form controls.
  initialFocus?: "accept" | "cancel" | "none";
  enterKeyAction?: "accept" | "cancel" | "none";
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

  initialFocus,
  enterKeyAction,
} : DialogModalProps) => {

  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (!open) return;
    if (hideFooter) return;

    const want = initialFocus ?? "none";
    if (want === "none") return;

    const shouldFocusAccept =
      want === "accept" && !acceptDisabled && !loading;
    const el = shouldFocusAccept ? acceptRef.current : cancelRef.current;
    if (!el) return;

    // Let the dialog mount and autofocus traps settle.
    const id = window.requestAnimationFrame(() => {
      try {
        el.focus();
      } catch {
        // noop
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, hideFooter, initialFocus, acceptDisabled, loading]);

  const onDialogKeyDown: React.KeyboardEventHandler = (e) => {
    if ((enterKeyAction ?? "none") === "none") return;
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Don't steal Enter inside form controls.
    const inFormControl = target.closest(
      'input, textarea, select, [contenteditable="true"]'
    );
    if (inFormControl) return;

    // If the user is already on a button/link, let the browser handle it.
    const onInteractive = target.closest('button, a, [role="button"], [role="link"]');
    if (onInteractive) return;

    if (enterKeyAction === "accept") {
      if (acceptDisabled || loading) return;
      e.preventDefault();
      void handleAccept();
      return;
    }

    if (enterKeyAction === "cancel") {
      if (loading || disableClose) return;
      e.preventDefault();
      handleCancel();
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
          <Dialog.Content onKeyDown={onDialogKeyDown}>
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
                      ref={cancelRef}
                      variant={cancelVariant ?? "outline"}
                      onClick={handleCancel}
                      disabled={Boolean(loading) || Boolean(disableClose)}
                    >
                      {cancelLabel ?? "Cancel"}
                    </Button>
                  </Dialog.ActionTrigger>
                )}
                <Button
                  ref={acceptRef}
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