import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4 relative overflow-hidden font-sans">
      {/* Brutalist accents */}
      <div className="absolute top-10 left-10 text-primary-500/30 font-mono text-2xl font-bold tracking-widest uppercase pointer-events-none">
        SECURE_LOGIN_TERMINAL //
      </div>
      <div className="absolute bottom-10 right-10 text-border font-mono text-sm uppercase pointer-events-none">
        SYS_STATUS: ONLINE
      </div>
      
      <div className="z-10 relative panel p-2 border-primary-500 shadow-glow bg-surface">
        <SignIn 
          appearance={{ 
            layout: {
              socialButtonsPlacement: "bottom",
              socialButtonsVariant: "blockButton",
            },
            elements: { 
              card: 'bg-surface shadow-none m-0 rounded-none border-none',
              headerTitle: 'text-white font-display font-bold uppercase tracking-wider text-xl',
              headerSubtitle: 'text-foreground/70 font-mono text-xs uppercase mt-2',
              socialButtonsBlockButton: 'border border-border bg-surface-hover text-white hover:bg-surface hover:border-primary-500 rounded-none font-mono uppercase tracking-wider text-xs',
              socialButtonsBlockButtonText: 'font-mono text-xs font-bold text-white uppercase tracking-wider',
              dividerLine: 'bg-border',
              dividerText: 'text-foreground/50 font-mono text-xs uppercase tracking-widest',
              formFieldLabel: 'text-white font-mono text-xs uppercase tracking-wider font-bold',
              formFieldInput: 'bg-surface-hover border border-border text-white focus:ring-1 focus:ring-primary-500 rounded-none font-mono py-2',
              formButtonPrimary: 'bg-primary-600 hover:bg-primary-500 text-white rounded-none font-mono uppercase tracking-widest font-bold border border-primary-400 shadow-glow mt-4 py-3',
              footerActionText: 'text-foreground/70 font-mono text-xs uppercase',
              footerActionLink: 'text-primary-400 font-mono text-xs uppercase hover:text-primary-300 font-bold',
              identityPreviewText: 'text-white font-mono text-sm',
              identityPreviewEditButton: 'text-primary-400 hover:text-primary-300',
              formFieldWarningText: 'text-amber-400 font-mono text-xs',
              formFieldErrorText: 'text-red-400 font-mono text-xs',
              alertText: 'text-white font-mono text-xs',
              alert: 'border border-border bg-surface-hover rounded-none',
            } 
          }} 
        />
      </div>
    </div>
  );
}
