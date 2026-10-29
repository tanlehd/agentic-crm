# Human outbound — T09 transition

The baseline D2 Chat coordinator and its rollout/rollback scripts have been removed from current source. The sole replacement is the independent Chat API/worker described in [Chat runtime](../../services/chat/README.md) and the [cutover handoff](chat-cutover-handoff.md). Do not restart a previous baseline writer after destination writes.

Main cutover remains IN_PROGRESS. Existing pinned D2 containers have not yet been stopped or replaced; the final source freeze and copy will stop/drain them and remove the obsolete Chat/coordinator containers. Inspect actual running processes with `docker ps`; source removal does not change a running image. `compose.human-outbound.yaml` now declares only the retained Identity authority and Connector dispatch peers. Their private key material and data remain retained.

Current outbound acceptance is [T08 composed parity](../quality/t08-chat-parity-acceptance.md). Native tests run through `scripts/identity-owner-native-test.mjs --focus="Chat outbound"`; container composition/recovery adds `--with-runtime` as documented in that acceptance. T09 adds main public smoke, restart and post-write freeze/forward recovery before DONE.

Historical D2 delivery and previous rollout commands are recorded in [SRC-108 evidence](../tracking/details/SRC-108.md). They are historical evidence, not current operating instructions. No production or real provider activation is implied.
