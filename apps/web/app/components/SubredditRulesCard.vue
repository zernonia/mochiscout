<script setup lang="ts">
import { ExternalLinkIcon, PencilIcon, RotateCcwIcon } from '@lucide/vue'
import { toast } from '@/lib/toast'

type PromoPolicy = 'none' | 'weekly_thread_only' | 'flair_only' | 'allowed_with_value' | 'allowed'
type Links = 'none' | 'in_comments_only' | 'yes'

interface Rules {
  promo_policy: PromoPolicy
  self_promo_thread: string | null
  min_karma: number | null
  min_account_age_days: number | null
  links_allowed: Links | null
  cooldown_days: number | null
  notes: string
  last_verified: string
  official: { title: string, text: string, kind: 'all' | 'link' | 'comment' }[]
}

const props = defineProps<{
  projectId: string
  name: string
  rules: Rules | null
  source: 'library' | 'custom' | null
  libraryRules: Rules | null
}>()
const emit = defineEmits<{ updated: [] }>()

const promo: Record<PromoPolicy, { label: string, class: string }> = {
  none: { label: 'No promotion', class: 'border-red-500/30 bg-red-500/8 text-red-700 dark:text-red-400' },
  weekly_thread_only: { label: 'Promo thread only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  flair_only: { label: 'Promo flair only', class: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400' },
  allowed_with_value: { label: 'Promo if valuable', class: 'border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-400' },
  allowed: { label: 'Promo allowed', class: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400' },
}

const date = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const rulesUrl = computed(() => `https://www.reddit.com/r/${props.name}/about/rules`)

// Editing this project's own copy, starting from what applies now.
const open = ref(false)
const saving = ref(false)
const form = reactive({ promo_policy: 'allowed_with_value' as PromoPolicy, self_promo_thread: '', min_karma: '', min_account_age_days: '', cooldown_days: '', links_allowed: 'unknown' as Links | 'unknown', notes: '' })
function startEdit() {
  const r = props.rules
  Object.assign(form, {
    promo_policy: r?.promo_policy ?? 'allowed_with_value',
    self_promo_thread: r?.self_promo_thread ?? '',
    min_karma: r?.min_karma?.toString() ?? '',
    min_account_age_days: r?.min_account_age_days?.toString() ?? '',
    cooldown_days: r?.cooldown_days?.toString() ?? '',
    links_allowed: r?.links_allowed ?? 'unknown',
    notes: r?.notes ?? '',
  })
  open.value = true
}
const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v))) || null)

async function save(rules: Record<string, unknown> | null) {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.projectId}/subreddits/${props.name}/rules`, { method: 'PUT', body: { rules } })
    toast.success(rules ? `Saved your rules for r/${props.name}` : `Using the library rules for r/${props.name}`)
    open.value = false
    emit('updated')
  }
  catch (error) {
    toast.error(apiErrorMessage(error, 'Could not save the rules'))
  }
  finally {
    saving.value = false
  }
}
function submit() {
  return save({
    promo_policy: form.promo_policy,
    self_promo_thread: form.self_promo_thread.trim() || null,
    min_karma: num(form.min_karma) ?? (form.min_karma.trim() === '0' ? 0 : null),
    min_account_age_days: num(form.min_account_age_days) ?? (form.min_account_age_days.trim() === '0' ? 0 : null),
    cooldown_days: num(form.cooldown_days),
    links_allowed: form.links_allowed === 'unknown' ? null : form.links_allowed,
    notes: form.notes.trim(),
  })
}
</script>

<template>
  <div class="flex flex-col gap-1.5 text-sm">
    <template v-if="rules">
      <div class="flex flex-wrap gap-1.5">
        <span class="rounded-full border px-2 py-0.5 text-xs font-medium" :class="promo[rules.promo_policy]?.class">{{ promo[rules.promo_policy]?.label }}</span>
        <Badge v-if="rules.cooldown_days" variant="outline">1 mention / {{ rules.cooldown_days }} days</Badge>
        <Badge v-if="rules.min_karma != null" variant="outline">{{ rules.min_karma }}+ karma</Badge>
        <Badge v-if="rules.min_account_age_days != null" variant="outline">{{ rules.min_account_age_days }}+ day account</Badge>
        <Badge v-if="rules.self_promo_thread" variant="outline">{{ rules.self_promo_thread }}</Badge>
      </div>
      <p v-if="rules.notes" class="text-xs text-muted-foreground">{{ rules.notes }}</p>
      <details v-if="rules.official.length" class="text-xs">
        <summary class="cursor-pointer text-muted-foreground hover:text-foreground">Read all {{ rules.official.length }} rules</summary>
        <ol class="mt-2 flex list-decimal flex-col gap-2 pl-4">
          <li v-for="r in rules.official" :key="r.title">
            <span class="font-medium">{{ r.title }}</span>
            <span v-if="r.kind !== 'all'" class="text-muted-foreground"> ({{ r.kind === 'link' ? 'posts' : 'comments' }})</span>
            <p v-if="r.text" class="mt-0.5 whitespace-pre-line text-muted-foreground">{{ r.text }}</p>
          </li>
        </ol>
      </details>
    </template>
    <p v-else class="text-xs text-muted-foreground">Not in the rules library yet. Read r/{{ name }}'s rules before posting, or add your own.</p>

    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      <span v-if="source === 'library'">From the rules library, checked {{ date(rules!.last_verified) }}</span>
      <span v-else-if="source === 'custom'" class="font-medium text-violet-700 dark:text-violet-400">Your rules for this project</span>
      <a :href="rulesUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-0.5 underline">On Reddit <ExternalLinkIcon class="size-3" /></a>
      <button type="button" class="inline-flex items-center gap-1 underline" @click="startEdit">
        <PencilIcon class="size-3" /> {{ source === 'custom' ? 'Edit' : rules ? 'Edit for this project' : 'Add your own' }}
      </button>
      <button v-if="source === 'custom'" type="button" class="inline-flex items-center gap-1 underline disabled:opacity-50" :disabled="saving" @click="save(null)">
        <RotateCcwIcon class="size-3" /> {{ libraryRules ? 'Use library rules' : 'Remove' }}
      </button>
    </div>

    <Sheet v-model:open="open">
      <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your rules for r/{{ name }}</SheetTitle>
          <SheetDescription>
            Drafts and checks in this project follow these instead of the rules library.
            Leave a field empty when the sub doesn't say. Other projects keep using the library.
          </SheetDescription>
        </SheetHeader>
        <form class="flex flex-col gap-3 px-4 pb-6 text-sm" @submit.prevent="submit">
          <div class="flex flex-col gap-1.5">
            <Label for="rp">Self-promotion</Label>
            <Select v-model="form.promo_policy">
              <SelectTrigger id="rp"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not allowed</SelectItem>
                <SelectItem value="weekly_thread_only">Only in a promo thread</SelectItem>
                <SelectItem value="flair_only">Only with promo flair</SelectItem>
                <SelectItem value="allowed_with_value">Allowed if the post is valuable</SelectItem>
                <SelectItem value="allowed">Allowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="rt">Promo thread or flair</Label>
            <Input id="rt" v-model="form.self_promo_thread" maxlength="200" placeholder="e.g. Weekly Self-Promotion Thread" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col gap-1.5"><Label for="rk">Min karma</Label><Input id="rk" v-model="form.min_karma" inputmode="numeric" /></div>
            <div class="flex flex-col gap-1.5"><Label for="ra">Min age (days)</Label><Input id="ra" v-model="form.min_account_age_days" inputmode="numeric" /></div>
            <div class="flex flex-col gap-1.5"><Label for="rc">Days between mentions</Label><Input id="rc" v-model="form.cooldown_days" inputmode="numeric" /></div>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="rl">Links to your site</Label>
            <Select v-model="form.links_allowed">
              <SelectTrigger id="rl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Not stated</SelectItem>
                <SelectItem value="none">Not allowed</SelectItem>
                <SelectItem value="in_comments_only">Only in comments</SelectItem>
                <SelectItem value="yes">Allowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="rn">Notes for drafts</Label>
            <Textarea id="rn" v-model="form.notes" rows="4" maxlength="1000" placeholder="What mods remove, what to disclose, what works here." />
          </div>
          <div class="flex gap-2 pt-1">
            <Button type="submit" :loading="saving">Save for this project</Button>
            <Button type="button" variant="ghost" @click="open = false">Cancel</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
