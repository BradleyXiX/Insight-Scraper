import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function Page() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4 relative font-sans">
      <div className="z-10 relative flex flex-col items-center my-8">
        <div className="mb-6">
          <Logo size={28} />
        </div>
        <SignUp />
      </div>
    </div>
  );
}
