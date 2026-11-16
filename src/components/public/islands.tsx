"use client";

import { lazy, Suspense, type ComponentProps } from "react";

/**
 * Interactive cards that need React state (forms). React.lazy splits each into its own chunk:
 * the server still renders their HTML, and on the client the boundary hydrates once its chunk
 * arrives (selective hydration), so the code never counts toward the route's first-load JS.
 * (React.lazy instead of next/dynamic: same effect without next/dynamic's ~3 kB loader.)
 */
const ContactForm = lazy(() => import("./blocks/ContactFormBlock").then((m) => ({ default: m.ContactFormBlock })));
const Form = lazy(() => import("./blocks/FormBlocks").then((m) => ({ default: m.FormBlock })));
const WaOrder = lazy(() => import("./blocks/WaOrderForm").then((m) => ({ default: m.WaOrderForm })));
const EmailSignup = lazy(() => import("./blocks/FormBlocks").then((m) => ({ default: m.EmailSignupBlock })));

export const ContactFormIsland = (p: ComponentProps<typeof ContactForm>) => (
  <Suspense>
    <ContactForm {...p} />
  </Suspense>
);
export const FormIsland = (p: ComponentProps<typeof Form>) => (
  <Suspense>
    <Form {...p} />
  </Suspense>
);
export const EmailSignupIsland = (p: ComponentProps<typeof EmailSignup>) => (
  <Suspense>
    <EmailSignup {...p} />
  </Suspense>
);
export const WaOrderIsland = (p: ComponentProps<typeof WaOrder>) => (
  <Suspense>
    <WaOrder {...p} />
  </Suspense>
);
