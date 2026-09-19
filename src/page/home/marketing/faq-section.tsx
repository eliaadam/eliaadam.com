// src/components/marketing/faq-section.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";

export function FaqSection() {
  return (
    <section className="border-t border-border py-20 lg:py-24">
      <div className="ds-container">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Frequently Asked
            </div>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
              Common questions
            </h2>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>What is SonicPesa?</AccordionTrigger>
              <AccordionContent>
                SonicPesa is a payment infrastructure platform designed to help businesses
                integrate digital payments into their products and services.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>Who can integrate SonicPesa?</AccordionTrigger>
              <AccordionContent>
                Businesses and developers can use the platform to build payment flows into
                websites, applications and other digital products.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Does SonicPesa support mobile money?</AccordionTrigger>
              <AccordionContent>
                The homepage presents support for major Tanzanian mobile money payment networks
                through the SonicPesa infrastructure.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Where can developers find the API documentation?</AccordionTrigger>
              <AccordionContent>
                Developer documentation can be accessed through the Documentation entry in the
                navigation and calls to action.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
}