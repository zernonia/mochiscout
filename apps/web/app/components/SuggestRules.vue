<script setup lang="ts">
import type { RulesSuggestion } from '~/utils/rules-yaml'
import { toast } from '@/lib/toast'

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
          <Select
            :model-value="form.links_allowed || 'unstated'"
            @update:model-value="v => form.links_allowed = v === 'unstated' ? '' : v as typeof form.links_allowed"
          >
            <SelectTrigger id="rl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unstated">Not stated</SelectItem>
              <SelectItem value="none">Not allowed</SelectItem>
              <SelectItem value="in_comments_only">Only in comments</SelectItem>
              <SelectItem value="yes">Allowed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>Post formats</Label>
          <CheckboxGroup v-model="form.post_formats" class="flex flex-row flex-wrap gap-3">
            <Label v-for="f in ['text', 'link', 'image', 'video']" :key="f" class="font-normal">
              <Checkbox :value="f" /> {{ f }}
            </Label>
          </CheckboxGroup>
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
