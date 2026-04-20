# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the NinerLog frontend, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **security@ninerlog.com** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (if available)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Scope

This policy covers the `ninerlog-frontend` repository, including:

- Client-side authentication token handling
- Cross-site scripting (XSS) prevention
- Content Security Policy (CSP) headers
- Third-party dependency vulnerabilities
- nginx configuration and static asset serving

## Security Practices

- **Token Storage**: Secure handling of JWT tokens
- **XSS Prevention**: React's built-in escaping, no `dangerouslySetInnerHTML`
- **CSP Headers**: Configured via nginx in production
- **Dependencies**: Automated security audits via Dependabot and `npm audit`
- **TLS**: Production served via nginx with Let's Encrypt certificates

## Disclosure Policy

We follow a coordinated disclosure process. After a fix is released, we will publicly acknowledge the reporter (unless they prefer to remain anonymous).
