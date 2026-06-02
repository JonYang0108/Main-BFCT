import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import logo from "@/assets/bfct-logo.jpg";
import heroImage from "@/assets/auth-hero.jpg";

interface AuthLayoutProps {
  mode?: "login" | "register";
}

const AuthLayout = ({ mode = "login" }: AuthLayoutProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [transitioning, setTransitioning] = useState(false);

  const switchMode = (toLogin: boolean) => {
    if (transitioning || toLogin === isLogin) return;
    setTransitioning(true);
    setTimeout(() => {
      setIsLogin(toLogin);
      setTransitioning(false);
    }, 250);
  };

  return (
    <div className="min-h-screen w-full bg-background lg:h-screen lg:overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:h-screen">
        {/* LEFT / TOP: Branding panel (fixed on desktop, stacked on mobile) */}
        <aside
          className="relative lg:fixed lg:inset-y-0 lg:left-0 lg:w-1/2 overflow-hidden
                     w-full py-12 px-6 sm:py-16 lg:py-0 lg:px-0
                     flex items-center justify-center"
        >
          <img
            src={heroImage}
            alt="BFCT Bagsakan"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/50 to-black/70" />

          {/* Decorative circles */}
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-white/20 pointer-events-none" />
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full border border-white/10 pointer-events-none" />

          <div className="relative z-10 text-center px-4 sm:px-8 max-w-lg animate-fade-in w-full">
            <div className="flex items-center justify-center gap-3 mb-5 sm:mb-6">
              <img
                src={logo}
                alt="BFCT Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover ring-2 ring-white/40 shadow-lg"
              />
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                BFCT Bagsakan
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl xl:text-5xl font-bold text-white leading-tight drop-shadow-lg">
              Empowering Local Vendors
            </h2>
            <p className="mt-3 sm:mt-4 text-white/90 text-sm xl:text-lg drop-shadow max-w-md mx-auto">
              A unified platform to manage stalls, payments, and community
              announcements for the BFCT Bagsakan market.
            </p>
          </div>

          {/* Wavy cut — bottom on mobile, right edge on desktop */}
          <svg
            className="absolute bottom-[-1px] left-0 w-full h-12 sm:h-16 lg:hidden text-background"
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M0,60 C240,120 480,0 720,40 C960,80 1200,20 1440,60 L1440,100 L0,100 Z"
            />
          </svg>
          <svg
            className="hidden lg:block absolute top-0 right-[-1px] h-full w-16 text-background"
            viewBox="0 0 100 1440"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M60,0 C120,240 0,480 40,720 C80,960 20,1200 60,1440 L100,1440 L100,0 Z"
            />
          </svg>
        </aside>

        {/* RIGHT / BOTTOM: Scrollable form panel */}
        <main
          className="flex-1 lg:ml-[50%] lg:h-screen lg:overflow-y-auto
                     flex flex-col bg-background"
        >
          <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-20 xl:px-28">
            <div className="w-full max-w-md">
              <div
                key={isLogin ? "login" : "register"}
                className={`transition-all duration-300 ease-out ${
                  transitioning
                    ? "opacity-0 translate-y-3"
                    : "opacity-100 translate-y-0 animate-fade-in"
                }`}
              >
                {isLogin ? (
                  <LoginForm onSwitchToRegister={() => switchMode(false)} />
                ) : (
                  <RegisterForm onSwitchToLogin={() => switchMode(true)} />
                )}
              </div>

              <button
                onClick={() => navigate("/")}
                className="mt-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium mx-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
