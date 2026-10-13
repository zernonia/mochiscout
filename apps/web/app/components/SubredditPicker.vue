<script setup lang="ts">
import { BookOpenCheckIcon, EyeIcon, HashIcon, LoaderIcon } from '@lucide/vue'

/**
 * The "watch a subreddit" box: type part of a name ("prod") and pick from
 * known subreddits and Reddit's own search, or watch exactly what was typed.
 */
const props = defineProps<{ watched: string[] }>()
const emit = defineEmits<{ select: [name: string] }>()

interface Option { name: string, subscribers: number | null, description: string | null, hasRules?: boolean }

const query = ref('')
const results = ref<Option[]>([])
const searchingReddit = ref(false)
const open = ref(false)
const active = ref(0)
const listId = useId()

const typed = computed(() => query.value.trim().replace(/^(https?:\/\/(www\.|old\.)?reddit\.com)?\/?r\//i, '').replace(/\/.*$/, ''))
const typedIsName = computed(() => /^\w{2,21}$/.test(typed.value))
const watchedSet = computed(() => new Set(props.watched.map(w => w.toLowerCase())))
/** Results, plus what was typed when it isn't one of them. */
const options = computed<Option[]>(() => {
  const list = [...results.value]
  if (typedIsName.value && !list.some(o => o.name.toLowerCase() === typed.value.toLowerCase())) {
    list.push({ name: typed.value, subscribers: null, description: null })
  }
  return list
})

let seq = 0
/** The query Reddit's results were last shown for: a slower local answer doesn't replace them. */
let remoteShown = -1
let localTimer: ReturnType<typeof setTimeout> | undefined
let remoteTimer: ReturnType<typeof setTimeout> | undefined

async function search(q: string, remote: boolean, id: number) {
  try {
    const res = await $fetch<{ results: Option[] }>('/api/subreddits/search', { query: { q, remote: remote ? '1' : '0' } })
    if (id !== seq || (!remote && remoteShown === id)) return
    results.value = res.results
    if (remote) remoteShown = id
  }
  catch {
    // Typing still works without suggestions.
  }
  finally {
    if (remote && id === seq) searchingReddit.value = false
  }
}

watch(typed, (q) => {
  const id = ++seq
  clearTimeout(localTimer)
  clearTimeout(remoteTimer)
  active.value = 0
  if (!q) {
    results.value = []
    searchingReddit.value = false
    return
  }
  open.value = true
  localTimer = setTimeout(() => search(q, false, id), 100)
  searchingReddit.value = q.length >= 3
  if (searchingReddit.value) remoteTimer = setTimeout(() => search(q, true, id), 400)
})

function choose(option?: Option) {
  const name = option?.name ?? (typedIsName.value ? typed.value : null)
  if (!name) return
  emit('select', name)
  query.value = ''
  results.value = []
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  const n = options.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    open.value = true
    active.value = (active.value + 1) % n
  }
  else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  }
  else if (e.key === 'Escape') {
    open.value = false
  }
}

function submit() {
  choose(open.value ? options.value[active.value] : undefined)
}

const members = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const showList = computed(() => open.value && !!typed.value && (options.value.length > 0 || searchingReddit.value))
</script>

<template>
  <form class="relative flex gap-2" @submit.prevent="submit">
    <InputGroup class="flex-1">
      <InputGroupAddon><HashIcon /></InputGroupAddon>
      <InputGroupInput
        v-model="query"
        placeholder="Search subreddits to watch, e.g. productivity"
        aria-label="Subreddit"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :aria-expanded="showList"
        :aria-controls="listId"
        :aria-activedescendant="showList && options[active] ? `${listId}-${active}` : undefined"
        @keydown="onKeydown"
        @focus="open = true"
        @blur="open = false"
      />
      <InputGroupAddon v-if="searchingReddit" align="inline-end"><LoaderIcon class="animate-spin" aria-label="Searching Reddit" /></InputGroupAddon>
    </InputGroup>
    <Button type="submit" :disabled="!typedIsName && !options.length"><EyeIcon /> Watch</Button>

    <ul
      v-if="showList"
      :id="listId"
      role="listbox"
      class="absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
    >
      <li
        v-for="(o, i) in options"
        :id="`${listId}-${i}`"
        :key="o.name"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2"
        :class="i === active && 'bg-accent'"
        @mousedown.prevent="choose(o)"
        @mousemove="active = i"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span class="font-medium">r/{{ o.name }}</span>
            <span v-if="o.subscribers !== null" class="text-xs text-muted-foreground">{{ members.format(o.subscribers) }} members</span>
            <span v-if="watchedSet.has(o.name.toLowerCase())" class="rounded-full bg-emerald-500/12 px-1.5 text-[11px] leading-5 font-medium text-emerald-700 dark:text-emerald-400">Watching</span>
            <span v-else-if="o.hasRules" class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><BookOpenCheckIcon class="size-3" /> Rules known</span>
          </div>
          <p v-if="o.description" class="truncate text-xs text-muted-foreground">{{ o.description }}</p>
          <p v-else-if="o.subscribers === null && !o.hasRules" class="text-xs text-muted-foreground">Watch exactly what you typed</p>
        </div>
      </li>
      <li v-if="searchingReddit" class="px-3 py-2 text-xs text-muted-foreground" aria-hidden="true">Searching Reddit…</li>
    </ul>
  </form>
</template>
