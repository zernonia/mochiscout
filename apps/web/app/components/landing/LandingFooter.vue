<script setup lang="ts">
import { COMPETITORS } from '#shared/competitors'
import { FREE_TOOLS } from '#shared/tools'

const links = [
  [
    { label: 'Pricing', to: '/#pricing' },
    { label: 'Sign in', to: '/login' },
    { label: 'Compare', to: '/alternatives' },
    { label: 'Free tools', to: '/tools' },
    ...FREE_TOOLS.map(t => ({ label: t.name, to: `/tools/${t.slug}` })),
    { label: 'Subreddit rules', to: '/subreddits' },
    ...COMPETITORS.filter(c => c.footer).map(c => ({ label: c.slug === 'gummysearch' ? 'GummySearch alternative' : `vs ${c.name}`, to: `/alternatives/${c.slug}` })),
  ],
  [
    { label: 'Terms', to: '/terms' },
    { label: 'Privacy', to: '/privacy' },
    { label: 'GitHub', href: site.repo },
    { label: 'Self-host', href: `${site.repo}/blob/main/docs/self-host.md` },
  ],
]
</script>

<template>
  <footer class="bg-neutral-950 text-neutral-300">
    <div class="mx-auto grid grid-cols-1 max-w-5xl gap-10 px-4 py-14 sm:grid-cols-[1.2fr_1fr_1fr_1.6fr]">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 font-semibold text-white">
          <LandingMochiMascot lively :blink="false" class="h-6 w-8" />
          Mochiscout
        </div>
        <p class="text-sm text-neutral-400">Find the people who need your product, and reply to them yourself.</p>
        <a :href="site.repo" target="_blank" rel="noopener" class="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white">
          <GitHubMark class="size-4" /> Open source on GitHub
        </a>
      </div>
      <ul v-for="(group, i) in links" :key="i" class="flex flex-col gap-2 text-sm">
        <li v-for="l in group" :key="l.label">
          <NuxtLink v-if="l.to" :to="l.to" class="hover:text-white">{{ l.label }}</NuxtLink>
          <a v-else :href="l.href" target="_blank" rel="noopener" class="hover:text-white">{{ l.label }}</a>
        </li>
      </ul>
      <p class="text-sm text-neutral-400">
        Operated by {{ site.operator }}.<br>
        <a :href="`mailto:${site.supportEmail}`" class="hover:text-white">{{ site.supportEmail }}</a>
      </p>
    </div>
  </footer>
</template>
