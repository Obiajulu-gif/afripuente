# Pollar verification run

- Run at: 2026-09-18T01:54:09.748Z
- Base URL: `https://sdk.api.pollar.xyz`
- Origin sent: `http://localhost:3000`
- Result: **2 passed, 3 blocked, 0 failed**

| Check | Status | Evidence |
| --- | --- | --- |
| SDK installed | PASS | `@pollar/core 0.11.3, @pollar/react 0.11.3` |
| SDK exports | PASS | `found PollarClient, StellarClient, WalletType, toBaseUnits (+47 more exports)` |
| API prefix | INFO | `base https://sdk.api.pollar.xyz; unprefixed /ramps/countries returns 404 (verified 2026-09-17)` |
| Ramp countries (publishable key) | BLOCKED | `401 {"code":"SDK_AUTH_INVALID_TOKEN","success":false}` |
| Bolivia BOB off-ramp quote | BLOCKED | `401 {"code":"SDK_AUTH_INVALID_TOKEN","success":false}` |
| Ramp countries (secret key — expected to be rejected) | BLOCKED | `403 {"code":"API_KEY_TYPE_NOT_ALLOWED","success":false}` |

> **Blocked checks are expected states, not defects.**
>
> - `ORIGIN_NOT_ALLOWED` — the origin above is not registered under
>   Build → Domains in the Pollar dashboard.
> - `API_KEY_TYPE_NOT_ALLOWED` — that endpoint rejects that key type by
>   design; ramp endpoints accept only the publishable key.
> - `SDK_AUTH_INVALID_TOKEN` — that endpoint requires an authenticated
>   **user session**. The publishable key alone is not enough: the SDK must
>   hold a DPoP-bound session minted by a browser login. This cannot be
>   reproduced from a Node script and is exercised by the app itself.
