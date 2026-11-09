---
"@yesid/ui": patch
---

Keep the reader's collapsed section choice when an optional or third-party script fails to load. Startup resource recovery now responds only to same-origin `/_app/` module scripts and modulepreloads, preserving readable content when app assets fail. No migration is required.
