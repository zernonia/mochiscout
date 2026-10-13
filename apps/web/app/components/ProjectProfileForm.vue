<script setup lang="ts">
import { PackageIcon, RadarIcon, TargetIcon } from '@lucide/vue'
import FormSection from './FormSection.vue'

export interface ProjectProfile {
  url: string
  name: string
  category: string
  icp: string
  problems: string[]
  keywords: string[]
  competitors: string[]
  searchTerms: string[]
  sources: ('hn' | 'bluesky' | 'x')[]
}

const profile = defineModel<ProjectProfile>({ required: true })
/** `sections` splits the form into labelled groups (profile page); the default is one plain stack (onboarding). */
withDefaults(defineProps<{ layout?: 'stack' | 'sections' }>(), { layout: 'stack' })

const sourceOptions = [
  { id: 'hn', label: 'Hacker News', hint: 'Stories and comments' },
  { id: 'bluesky', label: 'Bluesky', hint: 'Public posts' },
  { id: 'x', label: 'X', hint: 'Posts, through the official X API (Pro plan)' },
] as const

// Sources the server can't read (X without an API key) can't be turned on.
const { data: me } = useCachedFetch('/api/me')
const { edition } = useRuntimeConfig().public
function unavailable(id: 'hn' | 'bluesky' | 'x') {
  return !!me.value && !me.value.limits.sourcesAvailable.includes(id)
}
const unavailableHint = edition === 'cloud' ? 'Coming soon' : 'Set X_BEARER_TOKEN on the server to turn this on'

function toggleSource(id: 'hn' | 'bluesky' | 'x', on: boolean) {
  profile.value.sources = on ? [...new Set([...profile.value.sources, id])] : profile.value.sources.filter(s => s !== id)
}

const lists = [
  { key: 'problems', label: 'Problems it solves', hint: 'How a frustrated user would describe them.' },
  { key: 'keywords', label: 'Keywords', hint: 'What buyers type when looking for a tool like yours.' },
  { key: 'competitors', label: 'Competitors', hint: 'Used for "alternative to …" searches.' },
  { key: 'searchTerms', label: 'Search terms', hint: 'Phrases people write when they need you. Searched on Hacker News, Bluesky and X every hour.' },
] as const
</script>

<template>
  <div class="flex flex-col" :class="layout === 'sections' ? 'gap-8' : 'gap-5'">
    <component
      :is="layout === 'sections' ? FormSection : 'div'"
      v-bind="layout === 'sections' ? { title: 'About the product', description: 'What it is and who buys it.', icon: PackageIcon } : {}"
    >
      <div class="flex flex-col gap-5">
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="name">Product name</Label>
            <Input id="name" v-model="profile.name" required />
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="category">Category</Label>
            <Input id="category" v-model="profile.category" placeholder="e.g. invoicing app" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="url">URL</Label>
          <Input id="url" v-model="profile.url" type="url" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="icp">Who buys it</Label>
          <Textarea id="icp" v-model="profile.icp" rows="3" placeholder="Freelance designers who chase late invoices every month" />
        </div>
      </div>
    </component>

    <component
      :is="layout === 'sections' ? FormSection : 'div'"
      v-bind="layout === 'sections' ? { title: 'What to match', description: 'Keep these in your buyers\' words.', icon: TargetIcon } : {}"
    >
      <div class="flex flex-col gap-5">
        <div v-for="list in lists" :key="list.key" class="flex flex-col gap-2">
          <Label :for="list.key">{{ list.label }}</Label>
          <TagsInput v-model="profile[list.key]">
            <TagsInputItem v-for="item in profile[list.key]" :key="item" :value="item">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput :id="list.key" placeholder="Type and press Enter" />
          </TagsInput>
          <p class="text-xs text-muted-foreground">{{ list.hint }}</p>
        </div>
      </div>
    </component>

    <component
      :is="layout === 'sections' ? FormSection : 'div'"
      v-bind="layout === 'sections' ? { title: 'Also watch', description: 'Reddit is always on.', icon: RadarIcon } : {}"
    >
      <div class="flex flex-col gap-2">
        <template v-if="layout !== 'sections'">
          <Label>Also watch</Label>
          <p class="text-xs text-muted-foreground">Reddit is always on.</p>
        </template>
        <div class="grid gap-2">
          <label
            v-for="s in sourceOptions"
            :key="s.id"
            class="flex items-center gap-3 rounded-xl border p-3 text-sm transition-colors has-data-[state=checked]:border-brand/30 has-data-[state=checked]:bg-brand-soft/40"
            :class="unavailable(s.id) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
          >
            <SourceAvatar :platform="s.id" size="md" />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-1.5 font-medium">
                {{ s.label }}
                <span v-if="unavailable(s.id)" class="rounded-full bg-muted px-1.5 text-[10px] leading-4 font-medium text-muted-foreground">{{ edition === 'cloud' ? 'Soon' : 'Needs a key' }}</span>
              </span>
              <span class="text-xs text-muted-foreground">{{ unavailable(s.id) ? unavailableHint : s.hint }}</span>
            </span>
            <Switch
              :model-value="profile.sources.includes(s.id) && !unavailable(s.id)"
              :disabled="unavailable(s.id)"
              @update:model-value="(v: boolean) => toggleSource(s.id, v)"
            />
          </label>
        </div>
      </div>
    </component>
  </div>
</template>
