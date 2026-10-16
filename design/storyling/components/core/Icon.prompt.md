Render a Phosphor icon glyph in the brand's chunky fill/duotone style; use for every UI icon and small decorative star/cloud.
```jsx
<Icon name="star" color="var(--sun-400)" size={28} />
<Icon name="arrow-right" weight="bold" />   {/* mirrors in RTL */}
```
- `weight`: fill (default, UI + decor), bold (inline/arrows), duotone (feature tiles).
- Pass `label` only when the icon carries meaning on its own.
