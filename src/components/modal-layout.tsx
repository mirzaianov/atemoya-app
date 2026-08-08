'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import IconTooltip from './icon-tooltip';

import buttonStyles from './button.module.css';
import styles from './modal-layout.module.css';

interface ModalLayoutProps {
  alert?: boolean;
  children: ReactNode;
  closeDisabled?: boolean;
  compact?: boolean;
  title: string;
  titleId?: string;
}

export default function ModalLayout({
  alert = false,
  children,
  closeDisabled = false,
  compact = false,
  title,
  titleId,
}: ModalLayoutProps) {
  const closeLabel = `Close ${title} dialog`;
  const Modal = alert ? AlertDialog : Dialog;

  return (
    <Modal.Portal>
      <Modal.Backdrop className={styles.backdrop} />
      <Modal.Viewport className={styles.viewport}>
        <Modal.Popup className={clsx(styles.popup, compact && styles.compact)}>
          <IconTooltip label={closeLabel}>
            <Modal.Close
              aria-label={closeLabel}
              className={clsx(buttonStyles.button, styles.closeButton)}
              disabled={closeDisabled}
              type="button"
            >
              <X size={24} />
            </Modal.Close>
          </IconTooltip>
          <Modal.Title className={styles.title} id={titleId}>
            {title}
          </Modal.Title>
          {children}
        </Modal.Popup>
      </Modal.Viewport>
    </Modal.Portal>
  );
}
