import { createDataProtection } from './data-protection.ts';

interface DataProtectionEnvironment {
  [key: string]: string | undefined;
  BLIND_INDEX_ACTIVE_VERSION?: string;
  BLIND_INDEX_KEYS?: string;
  DATA_ENCRYPTION_ACTIVE_VERSION?: string;
  DATA_ENCRYPTION_KEYS?: string;
}

export const createDataProtectionFromEnvironment = (environment: DataProtectionEnvironment) =>
  createDataProtection({
    blindIndexActiveVersion: environment.BLIND_INDEX_ACTIVE_VERSION,
    blindIndexKeys: environment.BLIND_INDEX_KEYS,
    dataEncryptionActiveVersion: environment.DATA_ENCRYPTION_ACTIVE_VERSION,
    dataEncryptionKeys: environment.DATA_ENCRYPTION_KEYS,
  });

let dataProtection: ReturnType<typeof createDataProtection> | undefined;

export const getDataProtection = () => {
  dataProtection ??= createDataProtectionFromEnvironment(process.env);

  return dataProtection;
};
