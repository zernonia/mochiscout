import { cva, type VariantProps } from "class-variance-authority";

export { default as Empty } from "./Empty.vue";
export { default as EmptyContent } from "./EmptyContent.vue";
export { default as EmptyDescription } from "./EmptyDescription.vue";
export { default as EmptyHeader } from "./EmptyHeader.vue";
export { default as EmptyMedia } from "./EmptyMedia.vue";
export { default as EmptyTitle } from "./EmptyTitle.vue";

export const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "relative flex size-9 shrink-0 items-center justify-center rounded-md border bg-card not-dark:bg-clip-padding text-foreground shadow-sm/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)] [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
  },
);

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>;
