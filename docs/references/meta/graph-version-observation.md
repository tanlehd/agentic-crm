# Graph API version evidence — PLAN-003

Observed 2026-10-06 in public official pages using browser DOM/accessibility. This is an analyst transcription of the relevant rows, not a byte-for-byte downloaded Markdown snapshot.

Source: [Graph API versions](https://developers.facebook.com/docs/graph-api/changelog/versions).

| Graph API | Release | Expiration shown |
|---|---|---|
| v26.0 | July 29, 2026 | TBD |
| v25.0 | February 18, 2026 | July 29, 2028 |
| v24.0 | October 8, 2025 | February 18, 2028 |
| v21.0 | October 2, 2024 | January 21, 2027 |
| v12.0 | September 14, 2021 | February 8, 2024 |

[v26 release notes](https://developers.facebook.com/docs/graph-api/changelog/version26.0) were also read. Relevant protocol changes: `pretty` and `debug` ignored; `date_format` and root `GET /?ids=...` return errors; legacy ETag/304 behavior removed. CRM internal ETag/If-Match remains its own contract. Commerce order management endpoints deprecated; they are outside this M3 lead qualification scope. No endpoint availability or account access was tested.

Decision CHG-20261006-04: pin Graph API design baseline to **v26.0**, including webhook subscription version. Do not copy v12.0 examples or use `LATEST-API-VERSION` at runtime. Business Agent configuration pins **X-API-Version 2.0.0**, Thread Control reference **1.0.0**, independently of Graph API path version. [Exact source extraction](api-version-matrix.json). Production adapters remain subject to endpoint-specific sandbox gates in the capability matrix; the version table alone cannot establish provider permission/availability.
