<script setup lang="ts">
import { cva } from "class-variance-authority";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text select-none items-center justify-center gap-2 [&>kbd]:rounded-[calc(var(--radius)-5px)] in-[[data-slot=input-group]:has([data-slot=input-control],[data-slot=textarea-control])]:[&_svg:not([class*='size-'])]:size-4.5 sm:in-[[data-slot=input-group]:has([data-slot=input-control],[data-slot=textarea-control])]:[&_svg:not([class*='size-'])]:size-4 [&_svg]:-mx-0.5 not-has-[button]:**:[svg:not([class*='opacity-'])]:opacity-80",
  {
    defaultVariants: {
      align: "inline-start",
    },
    variants: {
      align: {
        "block-end":
          "order-last w-full justify-start px-[calc(--spacing(3)-1px)] pb-[calc(--spacing(3)-1px)] [.border-t]:pt-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
        "block-start":
          "order-first w-full justify-start px-[calc(--spacing(3)-1px)] pt-[calc(--spacing(3)-1px)] [.border-b]:pb-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
        "inline-end":
          "order-last pe-[calc(--spacing(3)-1px)] has-[>:last-child[data-slot=badge]]:-me-1.5 has-[>button]:-me-2 has-[>kbd:last-child]:me-[-0.35rem] [[data-size=sm]+&]:pe-[calc(--spacing(2.5)-1px)]",
        "inline-start":
          "order-first ps-[calc(--spacing(3)-1px)] has-[>:last-child[data-slot=badge]]:-ms-1.5 has-[>button]:-ms-2 has-[>kbd:last-child]:ms-[-0.35rem] [[data-size=sm]+&]:ps-[calc(--spacing(2.5)-1px)]",
      },
    },
  },
);

const props = withDefaults(
  defineProps<{
    align?: "block-end" | "block-start" | "inline-end" | "inline-start";
    class?: HTMLAttributes["class"];
  }>(),
  {
    align: "inline-start",
  },
);

function onMousedown(e: MouseEvent): void {
  const target = e.target as Element;
  if (!(e.currentTarget as HTMLElement).contains(target)) return;

  const isInteractive = target.closest(
    "button, a, input, select, textarea, [role='button'], [role='combobox'], [role='listbox'], [data-slot='select-trigger']",
  );
  if (isInteractive) return;
  e.preventDefault();
  const parent = (e.currentTarget as HTMLElement).parentElement;
  const input = parent?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea",
  );
  if (input && !parent?.querySelector("input:focus, textarea:focus")) {
    input.focus();
  }
}
</script>

<template>
  <div
    :class="cn(inputGroupAddonVariants({ align }), props.class)"
    :data-align="align"
    data-slot="input-group-addon"
    @mousedown="onMousedown"
  >
    <slot />
  </div>
</template>
