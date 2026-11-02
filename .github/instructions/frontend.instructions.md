---
applyTo: '**/*.{ts,tsx,js,jsx}'
---

## Frontend Guidelines

### Accessibility and HTML

- Prefer semantic HTML elements over generic containers.
- Give images meaningful alt text, or empty alt text when decorative.
- Give controls accessible names and use ARIA only when native HTML is insufficient.
- Keep interactive elements keyboard-operable, with visible focus and sufficient contrast.
- Use appropriate labels, roles, and state attributes for custom controls.

### React

- Use functional components and hooks; keep components focused on one responsibility.
- Define clear prop types with TypeScript. Follow existing state-management and component patterns before adding context or dependencies.
- Prefer classes or the project's styling system over inline styles; inline styles are appropriate for values that must be computed at runtime.
- Make interactive states and asynchronous loading or error states accessible.

### TypeScript and JavaScript

- Use camelCase for variables and functions, and PascalCase for components and types.
- Prefer `const`; use `let` only when reassignment is needed. End statements with semicolons and use single-quoted strings, consistent with the project style.
- Avoid `any`; use specific types and add explicit annotations when they improve clarity or catch errors.
- Prefer `interface` for extendable object shapes and `type` for unions or other type expressions.
- Keep functions focused. Use `async`/`await` when it makes asynchronous control flow clearer.
- Mark properties `readonly` when mutation should be disallowed.