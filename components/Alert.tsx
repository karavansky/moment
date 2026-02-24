"use client";

import {AlertDialog, Button} from "@heroui/react";

interface AlertProps {
  // You can add props here if needed
  variant?: "danger" | "danger-soft" | "ghost" | "outline" | "primary" | "secondary" ;
  title: string;
  description: string;
  size?: "sm" | "md" | "lg";
  onConfirm: () => void;    
}

export function Alert({ variant = "danger", title, description, size = "md", onConfirm }: AlertProps) {
  return (
    <AlertDialog>
      <Button variant={variant} size={size}>{title}</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog >
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon  status="danger" />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{description}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" size={size}>
                Cancel
              </Button>
              <Button slot="close" variant={variant} onClick={onConfirm}>
                {title}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}