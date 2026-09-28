Admin mobile integration
========================

The existing backend is unchanged. Screen layouts and StyleSheet values are preserved.

- Dashboard requests run concurrently, have timeouts and cancel on clinic change/unmount.
- User actions use `/staff` and check server success before closing forms or showing success.
- Search is debounced. The existing backend accepts only status 0/1, so All Status combines bounded pages (active first, then inactive); it does not download the entire directory.
- Roles/modules come from the server. Permission drafts save with the actual permission ID, clinic ID and execute flag. Failed saves retain unsaved drafts.
- Clinic management and Super Admin replace sample data with existing endpoints. Missing counts show unavailable values.
- The role API's established contract supports custom role names. Unsupported description/type changes are explicitly rejected instead of pretending they were saved.

Validation commands
-------------------

`npm test -- --runInBand` (the runner sets NODE_ENV=test)

`node node_modules/typescript/bin/tsc --noEmit`

Release prerequisites
---------------------

Android release signing uses these environment variables:

- ORBO_UPLOAD_STORE_FILE: path to the production upload keystore
- ORBO_UPLOAD_STORE_PASSWORD
- ORBO_UPLOAD_KEY_ALIAS
- ORBO_UPLOAD_KEY_PASSWORD

Release builds fail when signing credentials are missing instead of using the debug key. No key is generated or committed. R8 settings are unchanged pending a device-tested release.

Live API/device verification is still required: log in as each supported admin role; switch clinics while loading; test offline/retry, all user filters and pagination, create/update/deactivate/reset-password, permission save/retry, and clinic updates using a staging account.

Backend limitations remain outside this change: permission enforcement bypasses most modules; the Super Admin endpoint lacks an explicit role guard; staff creation has a shared default password when none is supplied. Client checks cannot secure those server routes. These prevent a complete production-readiness sign-off until addressed by the backend owner.

Existing mobile controls without implemented capabilities (for example clinic logo upload and column customization) are not a claim of completed functionality. They require separate integration; the UI has not been redesigned.
