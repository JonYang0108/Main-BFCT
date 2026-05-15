import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I register as a vendor?",
    a: "Visit the admin office with your valid ID, business permit, and completed application form. You can also start your registration online through the 'Get Started' button.",
  },
  {
    q: "What are the stall rental rates?",
    a: "Rental rates vary depending on stall size and location within the market. Contact the admin office or check the Announcements section for the latest rates.",
  },
  {
    q: "How do I pay my monthly rent?",
    a: "You can pay through the Vendor Dashboard using our secure online payment system, or visit the admin office for in-person payments.",
  },
  {
    q: "What happens if I miss a payment?",
    a: "Late payments are subject to penalties. You will receive notifications for upcoming and overdue payments. Contact admin for payment arrangements.",
  },
  {
    q: "Can I transfer my stall to another vendor?",
    a: "Stall transfers must be approved by the admin. Both parties need to submit a transfer request form at the admin office.",
  },
  {
    q: "How do I report a maintenance issue?",
    a: "Log into your Vendor Dashboard and submit a maintenance request, or contact the staff directly for urgent issues.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3">
            <HelpCircle className="h-4 w-4" /> Common Questions
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card rounded-xl border border-border px-6 shadow-card"
              >
                <AccordionTrigger className="text-left font-display font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
