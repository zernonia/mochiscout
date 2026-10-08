<script setup lang="ts">
import type { RulesSuggestion } from '~/utils/rules-yaml'
import { toast } from 'vue-sonner'

const props = defineProps<{
  subreddit: string
  current: null | {
    name: string
    promo_policy: RulesSuggestion['promo_policy']
    self_promo_thread: string | null
    min_karma: number | null
    min_account_age_days: number | null
    links_allowed: 'none' | 'in_comments_only' | 'yes' | null
    post_formats: string[]
    cooldown_days: number | null
    tags: string[]
    notes: string
    source: string
  }
}>()

const open = ref(false)
const { rulesRepo } = useRuntimeConfig().public
const c = props.current
const form = reactive<RulesSuggestion>({
  name: c?.name ?? props.subreddit,
  promo_policy: c?.promo_policy ?? 'allowed_with_value',
  self_promo_thread: c?.self_promo_thread ?? '',
  min_karma: c?.min_karma?.toString() ?? '',
  min_account_age_days: c?.min_account_age_days?.toString() ?? '',
  links_allowed: c?.links_allowed ?? '',
  post_formats: c?.post_formats ?? ['text'],
  cooldown_days: c?.cooldown_days?.toString() ?? '7',
  tags: c?.tags.join(', ') ?? '',
  notes: c?.notes ?? '',
  source: c?.source ?? `https://www.reddit.com/r/${props.subreddit}/about/rules`,
})
const yaml = computed(() => rulesYaml(form))
const issueUrl = computed(() => rulesIssueUrl(rulesRepo, form, yaml.value))
const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm'

async function copy() {
  await navigator.clipboard.writeText(yaml.value)
  toast.success('YAML copied')
}
</script>

<template>
  <button type="button" class="self-start text-xs text-muted-foreground underline" @click="open = true">
    {{ current ? 'Suggest a rule change' : 'Add its rules' }}
  </button>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Rules for r/{{ subreddit }}</SheetTitle>
        <SheetDescription>Check the sub's rules page and sidebar, then send the result to the shared rules database. Leave a field empty when the sub doesn't say.</SheetDescription>
      </SheetHeader>
      <div class="flex flex-col gap-3 px-4 pb-6 text-sm">
        <div class="flex flex-col gap-1.5">
          <Label for="rp">Self-promotion</Label>
          <select id="rp" v-model="form.promo_policy" :class="selectClass">
            <option value="none">Not allowed</option>
            <option value="weekly_thread_only">Only in a promo thread</option>
            <option value="flair_only">Only with promo flair</option>
            <option value="allowed_with_value">Allowed if the post is valuable</option>
            <option value="allowed">Allowed</option>
          </select>
        </div>
        <div v-if="form.promo_policy === 'weekly_thread_only'" class="flex flex-col gap-1.5">
          <Label for="rt">Promo thread name</Label>
          <Input id="rt" v-model="form.self_promo_thread" />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="flex flex-col gap-1.5"><Label for="rk">Min karma</Label><Input id="rk" v-model="form.min_karma" inputmode="numeric" /></div>
          <div class="flex flex-col gap-1.5"><Label for="ra">Min age (days)</Label><Input id="ra" v-model="form.min_account_age_days" inputmode="numeric" /></div>
          <div class="flex flex-col gap-1.5"><Label for="rc">Cooldown (days)</Label><Input id="rc" v-model="form.cooldown_days" inputmode="numeric" /></div>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="rl">Links</Label>
          <select id="rl" v-model="form.links_allowed" :class="selectClass">
            <option value="">Not stated</option>
            <option value="none">Not allowed</option>
            <option value="in_comments_only">Only in comments</option>
            <option value="yes">Allowed</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>Post formats</Label>
          <div class="flex flex-wrap gap-3">
            <label v-for="f in ['text', 'link', 'image', 'video']" :key="f" class="flex items-center gap-1.5">
              <input v-model="form.post_formats" type="checkbox" :value="f"> {{ f }}
            </label>
          </div>
        </div>
        <div class="flex flex-col gap-1.5"><Label for="rg">Tags</Label><Input id="rg" v-model="form.tags" placeholder="saas, startups, b2b" /></div>
        <div class="flex flex-col gap-1.5"><Label for="rn">Notes for posters</Label><Textarea id="rn" v-model="form.notes" rows="3" placeholder="What mods remove, what does well" /></div>
        <div class="flex flex-col gap-1.5"><Label for="rs">Source</Label><Input id="rs" v-model="form.source" /></div>
        <pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs">{{ yaml }}</pre>
        <div class="flex gap-2">
          <Button as-child><a :href="issueUrl" target="_blank" rel="noopener">Open a GitHub issue</a></Button>
          <Button type="button" variant="outline" @click="copy">Copy YAML</Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
