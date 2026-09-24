---
'style-dictionary': patch
---

Emit base64 asset values as quoted string literals in CSS-family variable formats

When `asset/base64` is applied to an `asset` token, the resulting base64 payload is now emitted as a double-quoted string literal in `scss/variables`, `css/variables`, `less/variables` and `stylus/variables` outputs:

```scss
$asset-icon-delete: "PHN2ZyB4bWxucz0iaHR0...";
```

Base64 output routinely contains `+`, `/` and `=` padding, which Sass/Less read as arithmetic or division operators — or as a parse error — when left unquoted, so the generated stylesheet could fail to compile or silently evaluate to the wrong value. This matches what the predefined-transforms reference and the `assets-base64-embed` example have always documented.

Only asset values that match the base64 alphabet (`A-Za-z0-9+/=`) are wrapped — those can never contain a quote, backslash or newline, so no escaping is needed. Every other asset value is emitted unchanged, including values that already carry their own quoting and CSS functions such as the `url(...)` produced by `asset/url`. Non-asset tokens are unaffected, and JSON/JavaScript outputs (`json/flat`, `javascript/es6`) still contain the raw base64 so `data:image/png;base64,${token}`-style embedding keeps working.
