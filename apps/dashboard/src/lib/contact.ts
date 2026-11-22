export interface ContactChannel {
  id: "email" | "portfolio" | "github" | "linkedin";
  label: string;
  value: string;
  href: string;
  external: boolean;
}

export const OPERATOR_CONTACT = {
  name: "Bradley John Chiwo",
  email: "bradjohn70@gmail.com",
  mailto: "mailto:bradjohn70@gmail.com",
  githubHandle: "BradleyXiX",
  githubUrl: "https://github.com/BradleyXiX",
  linkedinUrl: "https://www.linkedin.com/in/bradley-john-chiwo",
  portfolioUrl: "https://bradleychiwo.netlify.app/",
} as const;

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  {
    id: "email",
    label: "Email",
    value: OPERATOR_CONTACT.email,
    href: OPERATOR_CONTACT.mailto,
    external: false,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    value: "bradleychiwo.netlify.app",
    href: OPERATOR_CONTACT.portfolioUrl,
    external: true,
  },
  {
    id: "github",
    label: "GitHub",
    value: `@${OPERATOR_CONTACT.githubHandle}`,
    href: OPERATOR_CONTACT.githubUrl,
    external: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    value: OPERATOR_CONTACT.name,
    href: OPERATOR_CONTACT.linkedinUrl,
    external: true,
  },
];
