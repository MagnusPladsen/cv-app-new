# Which browsers CVApp supports

`package.json` pins the build to Chrome and Edge 111, Firefox 113 and Safari
16.4. Those are not arbitrary: they are the versions where the CSS the app
already depends on became available.

| Feature | Used by | Available from |
|---|---|---|
| `color-mix()` | `spalte` and `sand` tint their panels from the accent | Chrome 111, Firefox 113, Safari 16.2 |
| Container queries | thumbnails and the preview | Chrome 105, Firefox 110, Safari 16 |
| `:has()` | Tailwind's `group-has` utilities | Chrome 105, Firefox 121, Safari 15.4 |

Without this, the build transpiles for browsers that cannot render the app
anyway and ships polyfills for `Array.prototype.at`, `flat`, `flatMap`,
`Object.fromEntries`, `Object.hasOwn`, `String.prototype.trimStart` and
`trimEnd` — about 14 KiB of JavaScript that every modern browser already has,
on a page that would look broken in any browser old enough to need it.

Raise the floor when the CSS floor rises. Lower it only with a reason, and
check the table above still holds.
