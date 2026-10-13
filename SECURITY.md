# Security policy

Mochiscout handles sign-ins, API keys, billing webhooks and other people's data, so we take reports seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Report privately instead:

- GitHub: **Security → Report a vulnerability** on this repository (private advisory), or
- Email **support@mochiscout.com** with "Security" in the subject.

Include what you found, how to reproduce it and the impact you see. We'll acknowledge within 3 working days, keep you posted while we fix it, and credit you in the release notes if you'd like.

## Scope

- This repository: the web app (`apps/web`), the browser extension (`apps/extension`) and the packages in `packages/`.
- The hosted service at mochiscout.com.

Out of scope: rate limits you can only exceed with large botnets, reports from automated scanners without a working proof of concept, and issues in third-party services we call (report those to the vendor).

## Supported versions

Only the latest `main` is supported. Self-hosters should update regularly (see [docs/self-host.md](docs/self-host.md#updating)).
