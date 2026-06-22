import type { Transition, Variants } from "framer-motion";

export const spring: Transition = { type: "spring", stiffness: 100, damping: 20 };

export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};
