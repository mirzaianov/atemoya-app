'use client';

import clsx from 'clsx';
import { House } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import BrandHeader from '../../components/brand-header';
import type { Tag } from '../../types';
import TagManagerDialog from '../home/tag-manager-dialog';
import DeleteAccountDialog from './delete-account-dialog';
import NicknameEditDialog from './nickname-edit-dialog';
import PasswordResetSettings from './password-reset-settings';
import TwoFactorSettings from './two-factor-settings';

import buttonStyles from '../../components/button.module.css';
import styles from './settings.module.css';

const buttonSmall = 20;

interface SettingsProps {
  tags: Tag[];
  twoFactorEnabled: boolean;
  userEmail: string;
  userNickname: string;
}

export default function Settings({
  tags: initialTags,
  twoFactorEnabled: initialTwoFactorEnabled,
  userEmail,
  userNickname: initialNickname,
}: SettingsProps) {
  const [previousInitialNickname, setPreviousInitialNickname] = useState(initialNickname);
  const [previousInitialTags, setPreviousInitialTags] = useState(initialTags);
  const [previousInitialTwoFactorEnabled, setPreviousInitialTwoFactorEnabled] =
    useState(initialTwoFactorEnabled);
  const [nickname, setNickname] = useState(initialNickname);
  const [tags, setTags] = useState(initialTags);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);

  if (initialNickname !== previousInitialNickname) {
    setPreviousInitialNickname(initialNickname);
    setNickname(initialNickname);
  }

  if (initialTags !== previousInitialTags) {
    setPreviousInitialTags(initialTags);
    setTags(initialTags);
  }

  if (initialTwoFactorEnabled !== previousInitialTwoFactorEnabled) {
    setPreviousInitialTwoFactorEnabled(initialTwoFactorEnabled);
    setTwoFactorEnabled(initialTwoFactorEnabled);
  }

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
              value={nickname}
            />
            <NicknameEditDialog currentNickname={nickname} onUpdated={setNickname} />
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
          <TwoFactorSettings enabled={twoFactorEnabled} onEnabledChange={setTwoFactorEnabled} />
        </div>
      </section>
      <section className={styles.options} aria-labelledby="tag-settings">
        <div className={styles.optionRow}>
          <h2 className={styles.optionTitle} id="tag-settings">
            Tags
          </h2>
          <TagManagerDialog
            onDeleted={(id) => setTags((current) => current.filter((tag) => tag.id !== id))}
            onUpdated={(updatedTag) =>
              setTags((current) => {
                const nextTags = current.map((tag) =>
                  tag.id === updatedTag.id ? updatedTag : tag,
                );

                // oxlint-disable-next-line unicorn/no-array-sort -- The project targets ES2022.
                return nextTags.sort((left, right) => left.name.localeCompare(right.name));
              })
            }
            tags={tags}
          />
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
