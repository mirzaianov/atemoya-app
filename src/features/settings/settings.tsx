import clsx from 'clsx';
import { House } from 'lucide-react';
import Link from 'next/link';

import BrandHeader from '../../components/brand-header';
import DeleteAccountDialog from './delete-account-dialog';
import NicknameEditDialog from './nickname-edit-dialog';
import PasswordResetSettings from './password-reset-settings';
import TwoFactorSettings from './two-factor-settings';

import buttonStyles from '../../components/button.module.css';
import styles from './settings.module.css';

const buttonSmall = 20;

interface SettingsProps {
  twoFactorEnabled: boolean;
  userEmail: string;
  userNickname: string;
}

export default function Settings({ twoFactorEnabled, userEmail, userNickname }: SettingsProps) {
  return (
    <div className={styles.container}>
      <BrandHeader />
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="settings-nickname">
            Nickname
          </label>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              id="settings-nickname"
              type="text"
              readOnly
              value={userNickname}
            />
            <NicknameEditDialog currentNickname={userNickname} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="settings-email">
            Email
          </label>
          <input
            className={styles.input}
            id="settings-email"
            type="email"
            readOnly
            value={userEmail}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="settings-password">
            Password
          </label>
          <input
            className={styles.input}
            id="settings-password"
            type="password"
            autoComplete="off"
            readOnly
            value="********"
          />
          <PasswordResetSettings userEmail={userEmail} />
        </div>
      </div>
      <section className={styles.options} aria-labelledby="security-settings">
        <div className={styles.optionRow}>
          <h2 className={styles.optionTitle} id="security-settings">
            Security
          </h2>
          <TwoFactorSettings enabled={twoFactorEnabled} />
        </div>
      </section>
      <section className={styles.options} aria-labelledby="account-settings">
        <div className={styles.optionRow}>
          <h2 className={styles.optionTitle} id="account-settings">
            Account
          </h2>
          <DeleteAccountDialog userEmail={userEmail} />
        </div>
      </section>
      <Link
        className={clsx(
          buttonStyles.button,
          buttonStyles.standard,
          buttonStyles.fullWidth,
          buttonStyles.primary,
        )}
        href="/"
      >
        <span className={buttonStyles.buttonTop}>
          <House size={buttonSmall} />
          Go Home
        </span>
      </Link>
    </div>
  );
}
