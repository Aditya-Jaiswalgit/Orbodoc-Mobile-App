# User management and role permissions parity review

Reference: the local ORBO DOC Web source in `../frontend` and existing route/controller implementations in `../backend`. The deployed authenticated `orbodoc.com` application was not accessible for comparison. No backend changes were made.

## Root causes and changes

| Area | Root cause | Mobile change |
| --- | --- | --- |
| Reset password | Empty and short passwords shared one toast; an empty confirmation was treated as a mismatch. Native modal fields had no inline errors. | Separate required/length/mismatch messages, red borders and accessibility flags; errors clear on correction/reopen. Server failures stay visible in the modal. Duplicate submissions and dismissals during saving are blocked. |
| Edit user validation | Name, phone, role and experience shared one generic toast; professional fields shared another. | Errors appear against the individual fields. Phone input follows Web's digit/country-prefix normalization. |
| Edit actions | Full-width status button plus a separate wrapping group produced uneven rows. | Mobile order follows Web: Update/Cancel, then Reset/Deactivate. Equal column widths and minimum heights; narrow screens or large font scaling use a single column. Desktop retains status/reset/cancel/update order. |
| Role catalog | Mobile traversed API roles in the opposite order and repeated different role filters. | Shared Web-equivalent catalog order, normalized-name deduplication and first-response-row precedence; clinic-specific role IDs are retained. API role IDs, names and system flags are normalized. |
| Role eligibility | Role filtering and clinic selection used inconsistent conditions, including numeric role-ID and clinic-count shortcuts. | Super Admin and other users with screen permission receive the API catalog; Clinic Admin's manageable list excludes normalized Super Admin/Clinic Admin roles. Create Staff excludes Patient. Existing admin user roles remain locked. The permission selector preserves Web's exception for otherwise hidden roles that already have matrix rows. |
| Clinic entitlement | Assigned clinic count was used instead of Web's plan entitlement. | Login/switch-clinic plan data supplies `isMultiPlan`: `plan_type`/`planType` is `multi`, or `max_clinics`/`maxClinics` exceeds 1. Management clinic choice is enabled for Super Admin or a Clinic Admin with this entitlement. |
| Deactivation | Mobile sent a status PUT, while Web uses DELETE, which also revokes active sessions. | Confirmation followed by DELETE, with delete permission checked before displaying the action and again when confirming. Activation uses the validated edit PUT. |
| Doctor profile | Changing role overwrote the independent `is_doctor` flag. | Preserve that flag on role changes, as Web does. Protected admin doctor enable/disable retains the original role; disabling clears professional details. |
| Permission creation | The actor's `user_id` was absent. | Permission inserts include the actor and selected clinic, plus all five permission flags. |
| Loading/access | Role screen could fetch without view permission; user options always depended on a clinic-selector API, even for users without that selector. | Denied views do not fetch role data. Clinic selector calls follow Web eligibility, with an assigned-clinic fallback and retry notice on failure. Non-admin staff-list queries include the active clinic. |

## API comparison

Transport uses the existing `apiFetch`, its active Bearer token, JSON request bodies and unwrapped `data` response envelope. No duplicate API client or validation dependency was introduced. Existing request locks, clinic/session isolation, refresh/retry and partial permission-save handling are retained.

| Endpoint | Method and relevant fields | Review outcome |
| --- | --- | --- |
| `/staff` | GET: `page`, `limit`, `clinic_id`, `role_id`, `search`, `is_active` | Existing bounded pagination retained. All-status loading combines 0/1 queries, matching Web's split-status contract. Non-admin requests are explicitly clinic-scoped. Reads `data`, `total`, `page`, `limit`. |
| `/staff/:id` | GET: encoded staff ID | Loads `staff`, including saved address, role ID, doctor/profile fields and status before editing. Failure has a retry state. |
| `/staff` | POST: clinic/role IDs, name/email/phone/password and professional fields | Existing contract retained, with dynamic clinic-specific role options and numeric IDs. Patient role is excluded for staff creation. |
| `/staff/:id` | PUT: role ID, name/phone/address, professional fields, `is_doctor`, `is_active` | No email mutation; protected role ID retained. Activation sends validated form data. Doctor profile behavior aligned. |
| `/staff/:id` | DELETE: encoded staff ID | Replaces the status-only deactivation PUT; existing backend soft-deletes and revokes sessions. |
| `/staff/:id/reset-password` | POST: `{ newPassword }` | Endpoint/payload retained. Confirmation is client-only; submitted password is not trimmed. Field validation, visible failure and retry added. |
| `/user_role/list` | GET: optional `clinic_id` | API-driven global + selected-clinic rows; supported array/data/rows envelopes, field aliases and system flags normalized. Catalog ordering and duplicate precedence aligned with Web. |
| `/user_role/add` | POST: `role_name`, `clinic_id` | Existing contract retained. New custom role selected for permission setup. Duplicate normalized names rejected. |
| `/user_role/update/:id` | PUT: `role_name` | Existing contract retained. An unchanged name now preserves API spelling instead of saving its display label. |
| `/system_object/list` | GET | Existing module lookup retained, including display names and object IDs used by the matrix. |
| `/role_per/list` | GET: `clinic_id` | Management matrix stays clinic-scoped. `permission_id` and all `can_*`/Web flag aliases normalized. |
| `/role_per/permission/:roleId` | GET | Login/navigation access continues to use this Web endpoint rather than the management matrix. |
| `/role_per/add` | POST: role/object IDs, `clinic_id`, `user_id`, five `can_*` flags | Actor added; flags serialized as 0/1. |
| `/role_per/update/:permissionId` | PUT: five `can_*` flags | Existing permission ID and contract retained. Failed drafts remain retryable; successful inserts are not duplicated on retry. |
| `/clinics/my-clinics` | GET | Management selectors follow Web's plan/admin eligibility. Response clinics mapped to IDs/names; assigned clinics remain a fallback. |
| `/clinics/:id`, `/planFeatures/` | GET | Existing plan-module filtering retained. Disabled/unavailable modules are not exposed as unrestricted permissions. |
| `/auth/profile`, `/auth/switch-clinic` | GET profile; POST switch with `clinicId` | Existing authentication lifecycle retained. Login/switch responses now retain plan entitlement; switch token and permissions remain the active API context. |

Web references: `RolePermissionsPage.tsx`, `services/roleManagementApi.ts`, `services/userManagementApi.ts`, `services/api/client.ts`, `contexts/authUtils.ts`, `contexts/AuthContext.tsx`. Backend deactivation, protected-role and doctor semantics were checked against `routes/staffRoutes.js` and `handlers/Staffcontroller.js`.

## Changed implementation files

- `src/screens/staff/UserManagement.tsx`
- `src/screens/staff/RolePermissions.tsx`
- `src/utils/roleManagement.ts`
- `src/api/userManagementApi.ts`
- `src/api/roleManagementApi.ts`
- `src/context/AuthContext.tsx`
- `src/types/auth.ts`

## Verification

- `npx tsc --noEmit --pretty false`: passed.
- `npm test -- --runInBand --silent`: 14 suites, 144 tests passed.
- ESLint on every changed TypeScript/TSX implementation and test file: no errors.
- `git diff --check`: passed.
- Full-project `npm run lint`: 18 pre-existing errors in unchanged files. They are unused variables/imports in `UsersTableCard.tsx`, `PatientDashboardScreen.tsx`, `ChangePasswordScreen.tsx`, `MedicineBillingScreen.tsx`, `MyProfileScreen.tsx`, and hook-dependency errors in `useNotificationInbox.ts` and `useStaffHeaderData.ts`. Unrelated modules were left untouched.

Coverage includes blank/short/mismatched/valid passwords, stale-error clearing, server rejection/retry, duplicate submission, modal dismissal, role envelopes/order/deduplication, admin and custom-role filtering, denied/read-only access, clinic changes, plan entitlement, protected roles, doctor-profile preservation/disable, deactivation authorization and confirmation, activation, API methods/payloads, Bearer token replacement, malformed/network failures, and footer rendering at 320/390/600/1024 widths.

Remaining manual check: visual behavior on an Android/iOS device with the keyboard open and large accessibility fonts. Renderer tests verify structure/styles, not native pixel layout. Live deployed roles and account-specific API responses were not exercised; tests use fixtures based on the inspected Web/backend contracts.
