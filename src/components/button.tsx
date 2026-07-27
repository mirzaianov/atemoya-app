import { Button as BaseButton } from '@base-ui/react/button';
import clsx from 'clsx';
import type { MouseEventHandler, ReactNode } from 'react';

import Spinner from './spinner';

import styles from './button.module.css';

interface ButtonProps {
  styling: string;
  handleOnClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  text: string;
  textContent?: ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
}

const Button = ({
  styling,
  handleOnClick,
  icon,
  text,
  textContent,
  type = 'button',
  disabled = false,
  loading = false,
}: ButtonProps) => (
  <BaseButton
    aria-busy={loading || undefined}
    aria-label={loading ? `${text} in progress` : undefined}
    className={clsx(styles.button, styling)}
    onClick={handleOnClick}
    type={type}
    disabled={disabled || loading}
  >
    <span className={styles.buttonTop}>
      <span
        aria-hidden={loading || undefined}
        className={clsx(styles.buttonContent, loading && styles.buttonContentHidden)}
      >
        {icon}
        {textContent ?? text}
      </span>
      {loading ? (
        <span className={styles.buttonSpinner}>
          <Spinner />
        </span>
      ) : null}
    </span>
  </BaseButton>
);

export default Button;
