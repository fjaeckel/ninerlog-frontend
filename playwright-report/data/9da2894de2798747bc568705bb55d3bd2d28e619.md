# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Reset Password" [level=2] [ref=e6]
    - paragraph [ref=e7]: Enter your email address and we'll send you a reset link
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: Email address
      - textbox "Email address" [active] [ref=e11]:
        - /placeholder: pilot@example.com
      - paragraph [ref=e12]: Invalid email address
    - button "Send reset link" [ref=e13]
    - paragraph [ref=e14]:
      - text: Remember your password?
      - link "Sign in here" [ref=e15] [cursor=pointer]:
        - /url: /login
```