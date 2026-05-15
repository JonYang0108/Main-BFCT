import logo from "@/assets/bfct-logo.jfif";
import {
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "Announcements", href: "#announcements" },
  { label: "FAQ", href: "#faq" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
];

const Footer = () => {
  return (
    <footer className="bg-foreground pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logo}
                alt="BFCT Bagsakan"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="font-display font-bold text-lg text-background">
                BFCT Bagsakan
              </span>
            </div>
            <p className="text-background/60 text-sm leading-relaxed">
              A modern platform for managing market stalls, vendors, and
              payments with real-time monitoring.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-background/60">
                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                <span>info@bfctbagsakan.com</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-background/60">
                <Phone className="h-4 w-4 shrink-0 mt-0.5" />
                <span>+63 912 345 6789</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-background/60">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>BFCT Bagsakan Market, Philippines</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-display font-semibold text-background mb-4">
              Follow Us
            </h4>
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="h-10 w-10 rounded-lg bg-background/10 flex items-center justify-center text-background/60 hover:bg-background/20 hover:text-background transition-colors"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 pt-6">
          <p className="text-background/50 text-sm text-center">
            © {new Date().getFullYear()} BFCT Bagsakan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
