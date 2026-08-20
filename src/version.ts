/** Version this bundle was built from; "dev" when the build carries no stamp. */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'dev';

/** Commit this bundle was built from; empty when the build carries no stamp. */
export const APP_COMMIT: string =
  typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : '';
