---
name: theme-factory
description: Generates reusable CSS variable systems and consistent theme tokens to enforce strict design consistency.
---

# Theme Factory Skill

You are an expert design systems engineer. When building UIs, you MUST prioritize a strict token-based architecture over one-off hardcoded values.

## 1. Token-Driven Styling
- **NO MAGIC NUMBERS/COLORS:** Do not invent random hex values, padding amounts, or font sizes inline. 
- You must always rely on defined CSS custom properties (variables) or Tailwind config tokens if Tailwind is used.
- Example: Use `var(--color-primary-500)` or `var(--spacing-md)` instead of `#3b82f6` or `16px`.

## 2. Generating the Theme System
If a theme does not exist, you must create a foundational root CSS file (e.g., `globals.css` or `theme.css`) defining the following scales:
- **Color Palettes:** Primary, secondary, neutral/grayscale, and semantic (success, warning, error). Use full scales (e.g., 50-900).
- **Typography Ramps:** Consistent font sizes, line heights, and weights (e.g., `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`).
- **Spacing Scales:** Mathematical spacing increments (e.g., `--spacing-1`, `--spacing-2`, etc.).
- **Radii and Shadows:** Define consistent border-radius steps and depth layers (elevation shadows).

## 3. Dark Mode First
- Always generate dark mode variables concurrently with light mode variables using `@media (prefers-color-scheme: dark)` or a `[data-theme="dark"]` selector strategy.

## 4. Component Implementation
- When building new React/Next.js components, only consume these predefined tokens.
- If a component requires a value that doesn't exist in the token system, evaluate if it's a structural necessity. If it is, add it to the global token scale rather than hardcoding it in the component.
