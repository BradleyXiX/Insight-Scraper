/**
 * Clerk theming for the dark product surface.
 *
 * Two things are easy to get wrong with Clerk v7:
 *
 * 1. The prebuilt UI (@clerk/ui 1.x) reads `colorForeground`,
 *    `colorMutedForeground`, `colorInput`, `colorInputForeground`, ... — not the
 *    v6 names (`colorText`, `colorTextSecondary`, `colorInputBackground`). When
 *    the old keys are used Clerk falls back to `light-dark(...)`, which resolves
 *    to its *light* value because the app never declares `color-scheme: dark`.
 *    That produces near-black text on the #181818 card.
 * 2. Clerk injects its generated CSS unlayered at runtime, so it silently beats
 *    every Tailwind utility (Tailwind v4 utilities live in `@layer utilities`).
 *    `cssLayerName` moves Clerk's CSS into `@layer clerk`, and `globals.css`
 *    orders that layer before `utilities` so the classes below can win.
 */
export const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#18A9C2",
    colorPrimaryForeground: "#0A0A0A",
    colorBackground: "#181818",
    colorForeground: "#FAFAFA",
    colorMutedForeground: "#A3A3A3",
    colorInput: "#1F1F1F",
    colorInputForeground: "#FAFAFA",
    colorBorder: "#313131",
    colorRing: "#18A9C2",
    colorDanger: "#F87171",
    colorSuccess: "#34D399",
    colorWarning: "#F59E0B",
    colorShadow: "#000000",
    borderRadius: "0px",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
    fontFamilyMono: "var(--font-jetbrains-mono)",
  },
  elements: {
    card: "bg-surface shadow-none m-0 rounded-none border border-border",
    rootBox: "w-full max-w-md",
    headerTitle: "text-white font-sans font-semibold text-xl tracking-normal text-left",
    headerSubtitle: "text-foreground/70 font-sans text-sm mt-1 text-left",
    socialButtonsBlockButton:
      "border border-border bg-surface-hover text-white hover:bg-surface hover:border-border-strong rounded-none font-sans text-sm transition-colors",
    socialButtonsBlockButtonText: "font-sans text-sm font-medium text-white",
    dividerLine: "bg-border",
    dividerText: "text-foreground/60 font-mono text-xs uppercase tracking-wider",
    formFieldLabel: "text-white font-sans text-xs uppercase tracking-wider font-medium",
    formFieldInput:
      "bg-surface-hover border border-border text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent rounded-none font-mono py-2.5 transition-colors",
    formButtonPrimary:
      "bg-white hover:bg-zinc-200 text-black rounded-none font-sans text-sm font-semibold border-none mt-4 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent",
    footerActionText: "text-foreground/70 font-sans text-xs",
    footerActionLink: "text-accent font-sans text-xs hover:underline font-medium",
    identityPreviewText: "text-white font-mono text-sm",
    identityPreviewEditButton: "text-accent hover:underline",
    formFieldWarningText: "text-attention font-mono text-xs",
    formFieldErrorText: "text-danger font-mono text-xs",
    alertText: "text-white font-sans text-xs",
    alert: "border border-border bg-surface-hover rounded-none",
    footer: "bg-surface border-t border-border",
  },
};

export default clerkAppearance;
