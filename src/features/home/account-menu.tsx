'use client';

import { Menu } from '@base-ui/react/menu';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import IconTooltip from '../../components/icon-tooltip';
import Spinner from '../../components/spinner';
import { toast } from '../../components/toast-provider';
import { authClient } from '../../lib/auth-client';

import buttonStyles from '../../components/button.module.css';
import popupStyles from '../../styles/popup.module.css';
import styles from './account-menu.module.css';

const actionIconSize = 20;

interface AccountMenuProps {
  email: string;
  nickname: string;
}

export default function AccountMenu({ email, nickname }: AccountMenuProps) {
  const router = useRouter();
  const [isNavigationPending, startNavigation] = useTransition();
  const initials = nickname.slice(0, 2).toUpperCase();
  const actionBaseClassName = clsx(
    buttonStyles.button,
    buttonStyles.standard,
    buttonStyles.fullWidth,
    styles.action,
  );
  const settingsClassName = clsx(actionBaseClassName, buttonStyles.primary);
  const signOutClassName = clsx(actionBaseClassName, buttonStyles.destructive);
  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onError: () => toast.error('Sign out failed. Please try again.'),
    onSuccess: ({ error }) => {
      if (error) {
        toast.error('Sign out failed. Please try again.');

        return;
      }

      startNavigation(() => router.push('/login'));
    },
  });
  const isSignOutPending = signOutMutation.isPending || isNavigationPending;

  return (
    <Menu.Root>
      <IconTooltip label="Account menu">
        <Menu.Trigger
          aria-label={`Open account menu for ${nickname}. Signed in.`}
          className={clsx(buttonStyles.button, styles.trigger)}
        >
          {initials}
        </Menu.Trigger>
      </IconTooltip>
      <Menu.Portal>
        <Menu.Positioner align="end" className={styles.positioner} side="bottom" sideOffset={8}>
          <Menu.Popup className={clsx(styles.panel, popupStyles.popup)}>
            <Menu.Group className={styles.group}>
              <Menu.GroupLabel className={styles.identity}>
                <span className={styles.nickname}>{nickname}</span>
                <span className={styles.email}>{email}</span>
              </Menu.GroupLabel>
              <div className={styles.actions}>
                <Menu.LinkItem className={settingsClassName} render={<Link href="/settings" />}>
                  <span className={buttonStyles.buttonTop}>
                    <Settings size={actionIconSize} />
                    Settings
                  </span>
                </Menu.LinkItem>
                <Menu.Item
                  aria-busy={isSignOutPending || undefined}
                  aria-label={isSignOutPending ? 'Signing out' : undefined}
                  className={signOutClassName}
                  closeOnClick={false}
                  disabled={isSignOutPending}
                  onClick={() => signOutMutation.mutate()}
                >
                  <span className={buttonStyles.buttonTop}>
                    {isSignOutPending ? (
                      <Spinner />
                    ) : (
                      <>
                        <LogOut size={actionIconSize} />
                        Sign Out
                      </>
                    )}
                  </span>
                </Menu.Item>
              </div>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
