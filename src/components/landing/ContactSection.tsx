import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";

const ContactSection = () => {
  const [form, setForm] = useState({
  name: "",
  email: "",
  title: "",
  message: "",
});

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!form.name || !form.email || !form.message) {
    toast.error("Please fill in all fields");
    return;
  }

  try {
    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        from_name: form.name,
        from_email: form.email,
        title: form.title,
        message: form.message,
      },
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    toast.success("Message sent successfully!");

    setForm({
      name: "",
      email: "",
      title: "",
      message: "",
    });
  } catch (error) {
    console.error(error);
    toast.error("Failed to send message");
  }
};

  return (
    <section id="contact" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3">
            <Mail className="h-4 w-4" /> Get In Touch
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Contact Us
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Name
                </label>
                <Input
                  id="contact-name"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Email
                </label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                </div>

                 <div className="space-y-2">
                <label className="text-foreground text-sm font-medium">
                  Inquiry Title
                </label>

                <input
                  type="text"
                  placeholder="Your inquiry title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="
                    w-full
                    px-2.5
                    py-2.5
                    rounded-md
                    bg-transparent
                    border 
                    border-border
                    text-sm
                    text-foreground 
                    font-medium
                    placeholder:text-muted-foreground
                    focus:outline-none
                    focus:border-green-500
                    transition-all
                  "
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Message
                </label>
                <Textarea
                  id="contact-message"
                  name="message"
                  placeholder="How can we help you?"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary font-semibold gap-2"
              >
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </form>

            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">
                  BFCT Bagsakan, Marikina City, Philippines
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">+63 976 073 3835</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">info@bfctbagsakan.com</span>
              </div>
              <div className="flex gap-3 pt-2">
                <a
                  href="https://www.facebook.com/profile.php?id=100091528375133&_rdc=1&_rdr#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl overflow-hidden border border-border shadow-card min-h-[400px]"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1094.763797751088!2d121.08291346752888!3d14.625454875420738!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b93251c6d1ef%3A0x6ff93764bf7ef072!2sBFCT%20Bagsakan!5e0!3m2!1sen!2sph!4v1780163547686!5m2!1sen!2sph"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "400px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="BFCT Bagsakan Location"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
