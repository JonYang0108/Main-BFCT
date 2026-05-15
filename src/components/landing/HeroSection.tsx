import { motion } from "framer-motion";
import { ArrowRight, Store, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-market.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-16"
    >
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="BFCT Bagsakan Market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6 border border-primary/30">
            Vendor Management System
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
            BFCT Bagsakan
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed">
            A modern platform for managing market stalls, vendors, and payments.
            Streamline operations with real-time monitoring and secure
            transactions.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-gradient-primary font-semibold text-base px-8 gap-2"
              onClick={() => navigate("/register")}
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-semibold text-base px-8 border-primary-foreground/20 text-primary-foreground bg-primary-foreground/5 backdrop-blur-md hover:bg-primary-foreground/15 hover:text-primary-foreground hover:border-primary-foreground/40 transition-all duration-300"
              onClick={() => {
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn More
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16"
        >
          {[
            {
              icon: Store,
              label: "Stall Management",
              desc: "Monitor and assign stalls in real-time",
            },
            {
              icon: Users,
              label: "Vendor Portal",
              desc: "Manage vendors, payments, and products",
            },
            {
              icon: Shield,
              label: "Secure Payments",
              desc: "Track rent and generate receipts",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 p-5 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10"
            >
              <item.icon className="h-6 w-6 text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-semibold text-primary-foreground">
                  {item.label}
                </h3>
                <p className="text-sm text-primary-foreground/70">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
