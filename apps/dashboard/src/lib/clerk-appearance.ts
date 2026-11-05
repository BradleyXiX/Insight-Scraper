export const clerkAppearance = {
  variables: {
    colorPrimary: "#18A9C2",
    colorBackground: "#181818",
    colorText: "#FAFAFA",
    colorTextSecondary: "#9B9B9B",
    colorInputBackground: "#1F1F1F",
    colorInputText: "#FAFAFA",
    borderRadius: "0px",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
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
    dividerText: "text-foreground/50 font-mono text-xs uppercase tracking-wider",
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
