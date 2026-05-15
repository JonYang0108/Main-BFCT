import { motion } from "framer-motion";
import { BarChart3, Clock, FileText, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Real-Time Monitoring",
    desc: "Track stall occupancy, vendor status, and payments with live dashboards.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Role-Based",
    desc: "Admin, Staff, and Vendor roles with secure authentication and access control.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    desc: "Generate revenue, occupancy, and payment reports in downloadable PDF format.",
  },
  {
    icon: Clock,
    title: "Automated Alerts",
    desc: "Get notified about overdue payments, maintenance schedules, and announcements.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-medium text-primary mb-3 block">
              About Us
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
              Empowering Market Management
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              BFCT Bagsakan is a comprehensive vendor management system designed
              to modernize how public markets operate. From stall assignments to
              payment tracking, our platform brings efficiency and transparency
              to market management.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Built for administrators, staff, and vendors, the system provides
              role-based dashboards, real-time monitoring, and secure payment
              processing — making market operations seamless for everyone
              involved.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card border border-border"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
