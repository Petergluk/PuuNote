# Sandbox Architecture Notes

## Editor vs Canvas Environment
The Sandbox environment renders nodes in a simplified vertical column (or tree) structure to facilitate rapid testing of business logic, text processing, AI interactions, and React UI overlays. 

It **does not** simulate the 2D infinite canvas positioning system of the full PuuNote application. Although plugins may interact with node properties or layout logic in the main app, within this Sandbox environment, positional properties (such as `x`, `y`, `width`) on nodes are not used or mocked by the standard renderer.

Use the Sandbox to verify:
- Plugin registry hooks and API methods.
- UI Overlays, Toast notifications, and Background Jobs.
- Tree traversal and text content modifications.
- LLM prompt generation and text chunk streaming.

## Style Isolation
When shipping plugins, avoid importing generic CSS files (e.g. `styles.css`) that might pollute the global scope or interfere with the core application's `.css`.
Instead, use CSS-in-JS, Tailwind prefixes, Inline Styles, or explicit Shadow DOM for UI overlays and widget injections.
