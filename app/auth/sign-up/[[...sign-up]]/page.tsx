import { SignUp } from "@clerk/nextjs";
import { svSE } from "@clerk/localizations";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center texture-overlay px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[var(--charcoal)]">
            Vad blir det till <span className="text-[var(--terracotta)] italic">middag?</span>
          </h1>
          <p className="text-lg text-[var(--warm-gray)]">
            Veckoplanering av middagar på under en minut
          </p>
        </div>

        <div className="animate-scale-in delay-100">
          <SignUp
            localization={svSE}
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "card !shadow-lg",
                headerTitle: "font-['Playfair_Display'] !text-2xl",
                headerSubtitle: "!text-[var(--warm-gray)]",
                socialButtonsBlockButton: "!bg-white hover:!bg-[var(--cream-dark)] !border-2 !border-[var(--cream-dark)] hover:!border-[var(--terracotta)] !text-[var(--charcoal)] !shadow-sm hover:!shadow-md !transition-all",
                formButtonPrimary: "btn-primary !shadow-md hover:!shadow-lg",
                footerActionLink: "!text-[var(--terracotta)] hover:!text-[var(--terracotta-dark)]",
                formFieldInput: "!border-2 !border-[var(--cream-dark)] focus:!border-[var(--terracotta)] !rounded-xl",
                dividerLine: "!bg-[var(--cream-dark)]",
                dividerText: "!text-[var(--warm-gray)]",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
