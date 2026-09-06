# Security policy

Do not publish vulnerabilities, credentials, private phone numbers, precise
visitor locations, webhook payloads, or operator identity details in a public
issue.

After the repository is public, report security problems through a private
GitHub Security Advisory. Until that channel exists, contact the repository
owner privately through a channel they designate.

Reports should include the affected route or component, reproduction steps with
synthetic data, expected impact, and a suggested mitigation when available.
Never test against real residents, send public warnings, or trigger messaging
fan-out while reproducing a problem.

Security fixes are supported on the current `main` branch. Rotate any credential
immediately if it was committed or exposed, then remove it from the complete Git
history before publication.
