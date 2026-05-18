import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      <div className="z-10 relative">
        <SignUp appearance={{ elements: { formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700' } }} />
      </div>
    </div>
  );
}
