# 12 — Security

## Browser application threats

Consider:

- malicious image files
- malicious SVG
- malformed PSD files
- decompression bombs
- enormous image dimensions
- browser memory exhaustion
- malicious imported metadata
- unsafe URLs
- XSS through text/metadata
- prototype pollution in parsers

## SVG

Never blindly inject imported SVG into the DOM.

Sanitize or render through a safe mechanism.

## External URLs

Validate:

- image URLs
- sponsorship links
- imported resources

Avoid arbitrary JavaScript URLs.

## PSD parsing

Treat PSD files as untrusted input.

Parser must:

- validate headers
- validate dimensions
- guard allocations
- enforce reasonable limits
- fail gracefully
- never execute embedded code

## Memory limits

Before allocating huge buffers, estimate:

```text
width × height × channels × bytesPerChannel
```

Reject or warn about documents that would exceed safe limits.

## Content Security Policy

Create a restrictive CSP appropriate for:

- Next.js
- Google advertising
- consent tools
- required image/font sources

Document every third-party domain that must be allowed.

## Dependencies

Use automated dependency auditing.

Do not add a library merely because it provides a single small utility unless the tradeoff is justified.
