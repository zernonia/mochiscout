<script setup lang="ts">
import {
  ActivityIcon,
  CalendarCheckIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  FileTextIcon,
  HashIcon,
  InboxIcon,
  LightbulbIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@lucide/vue'

const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const { user, clear } = useUserSession()
const edition = useRuntimeConfig().public.edition

const projectId = computed(() => (route.params.project ? String(route.params.project) : null))
// Lazy: the page renders straight away and these fill in (skeletons meanwhile).
const { data: projects } = useCachedFetch('/api/projects', { key: 'sidebar-projects' })
const { data: me } = useCachedFetch('/api/me', { key: 'sidebar-me' })
const { data: orgs } = useCachedFetch('/api/orgs', { key: 'sidebar-orgs' })
const { data: counts } = useCachedFetch(() => `/api/projects/${projectId.value}/nav`, {
  key: 'project-nav',
  immediate: !!projectId.value,
  watch: [projectId],
})
// Counts are refreshed after each navigation by plugins/revalidate.client.ts.

const current = computed(() => projects.value?.find(p => p.id === projectId.value) ?? null)

const groups = computed(() => {
  const id = projectId.value
  if (!id) return []
  const c = counts.value
  return [
    {
      label: 'Daily',
      items: [
        { to: `/app/${id}/today`, label: 'Today', icon: CalendarCheckIcon },
        { to: `/app/${id}/inbox`, label: 'Inbox', icon: InboxIcon, count: c?.newThreads, tone: 'primary' as const },
        { to: `/app/${id}/drafts`, label: 'Drafts', icon: FileTextIcon, count: c?.drafts },
      ],
    },
    {
      label: 'Discover',
      items: [
        { to: `/app/${id}/subreddits`, label: 'Subreddits', icon: HashIcon, count: c?.watching },
        { to: `/app/${id}/research`, label: 'Research', icon: LightbulbIcon },
      ],
    },
    {
      label: 'Monitor',
      items: [
        { to: `/app/${id}/results`, label: 'Results', icon: TrendingUpIcon },
        { to: `/app/${id}/tracker`, label: 'Tracker', icon: ActivityIcon, count: c?.trackerAlerts || undefined, tone: 'alert' as const },
        { to: `/app/${id}/profile`, label: 'Project profile', icon: SlidersHorizontalIcon },
      ],
    },
  ]
})

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

const meters = computed(() => me.value
  ? [
      { label: 'Projects', used: me.value.usage.projects, limit: me.value.limits.projects },
      { label: 'Watched subreddits', used: me.value.usage.watchedSubreddits, limit: me.value.limits.watchedSubreddits },
      { label: 'AI drafts this month', used: me.value.usage.drafts, limit: me.value.limits.draftsPerMonth },
    ].filter(m => m.limit !== null)
  : [])

function initial(text?: string | null) {
  return (text?.trim()[0] ?? '?').toUpperCase()
}

async function openProject(id: string) {
  emit('navigate')
  await navigateTo(id === 'new' ? '/app/new' : `/app/${id}/today`)
}

async function switchOrg(orgId: string) {
  await $fetch('/api/orgs/active', { method: 'POST', body: { orgId } })
  // Projects belong to teams: start from the project list of the new team.
  window.location.href = '/app'
}

async function signOut() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-3">
    <NuxtLink to="/app" class="flex items-center gap-2 px-2 pt-1 font-semibold tracking-tight" @click="emit('navigate')">
      <LandingMochiMascot :blink="false" outline class="h-5 w-7" />
      Mochiscout
    </NuxtLink>

    <!-- Project switcher -->
    <div v-if="!projects" class="flex items-center gap-2.5 rounded-lg border bg-background p-2">
      <Skeleton class="size-8 rounded-md" />
      <div class="flex flex-1 flex-col gap-1.5"><Skeleton class="h-3.5 w-24" /><Skeleton class="h-3 w-32" /></div>
    </div>
    <Menu v-else>
      <MenuTrigger as-child>
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg border bg-background p-2 text-left shadow-xs/5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-accent"
        >
          <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-sm font-semibold text-white">
            {{ current ? initial(current.name) : '·' }}
          </span>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="block truncate text-sm font-medium">{{ current?.name ?? 'All projects' }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ current ? current.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : `${projects?.length ?? 0} project${projects?.length === 1 ? '' : 's'}` }}</span>
          </span>
          <ChevronsUpDownIcon class="size-4 shrink-0 text-muted-foreground" />
        </button>
      </MenuTrigger>
      <MenuPopup align="start" class="w-(--reka-dropdown-menu-trigger-width) min-w-56">
        <MenuGroupLabel>Projects</MenuGroupLabel>
        <MenuItem v-for="p in projects" :key="p.id" @select="openProject(p.id)">
          <span class="flex size-5 items-center justify-center rounded bg-neutral-900 text-[10px] font-semibold text-white">{{ initial(p.name) }}</span>
          <span class="truncate">{{ p.name }}</span>
        </MenuItem>
        <MenuSeparator />
        <MenuItem @select="openProject('new')">
          <PlusIcon /> New project
        </MenuItem>
        <MenuItem @select="emit('navigate'); navigateTo('/app')">
          All projects
        </MenuItem>
      </MenuPopup>
    </Menu>

    <!-- Project navigation -->
    <nav v-if="groups.length" class="flex flex-col gap-4">
      <div v-for="g in groups" :key="g.label" class="flex flex-col gap-0.5">
        <div class="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{{ g.label }}</div>
        <NuxtLink
          v-for="item in g.items"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'"
          @click="emit('navigate')"
        >
          <component :is="item.icon" class="size-4 shrink-0" :class="isActive(item.to) ? 'text-foreground' : ''" />
          <span class="flex-1 truncate">{{ item.label }}</span>
          <span
            v-if="item.count"
            class="min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-medium tabular-nums"
            :class="item.tone === 'primary'
              ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
              : item.tone === 'alert'
                ? 'bg-red-500/12 text-red-700 dark:text-red-400'
                : 'bg-muted text-muted-foreground'"
          >{{ item.count }}</span>
        </NuxtLink>
      </div>
    </nav>
    <div v-else class="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
      Pick a project to see its inbox, subreddits and drafts.
    </div>

    <div class="mt-auto flex flex-col gap-3">
      <!-- Plan and usage -->
      <div v-if="!me && edition === 'cloud'" class="flex flex-col gap-2.5 rounded-lg border bg-background p-3">
        <Skeleton class="h-4 w-20" /><Skeleton class="h-1.5 w-full" /><Skeleton class="h-1.5 w-full" />
      </div>
      <div v-if="me && edition === 'cloud'" class="flex flex-col gap-2.5 rounded-lg border bg-background p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">{{ me.limits.label }} plan</span>
          <span v-if="me.org.planStatus === 'past_due'" class="text-[11px] font-medium text-red-600">Payment due</span>
        </div>
        <div v-for="m in meters" :key="m.label" class="flex flex-col gap-1">
          <div class="flex justify-between text-[11px] text-muted-foreground">
            <span>{{ m.label }}</span>
            <span class="tabular-nums">{{ m.used }}/{{ m.limit }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all"
              :class="m.used >= (m.limit ?? 0) ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-neutral-100'"
              :style="{ width: `${Math.min(100, (m.used / Math.max(1, m.limit ?? 1)) * 100)}%` }"
            />
          </div>
        </div>
        <Button v-if="me.org.plan !== 'pro'" as-child size="sm" variant="outline" class="mt-0.5">
          <NuxtLink to="/app/billing" @click="emit('navigate')">Upgrade</NuxtLink>
        </Button>
      </div>

      <!-- Account -->
      <Menu>
        <MenuTrigger as-child>
          <button type="button" class="flex w-full items-center gap-2.5 rounded-lg p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-accent">
            <img v-if="user?.image" :src="user.image" alt="" class="size-7 rounded-full">
            <span v-else class="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{{ initial(user?.name || user?.email) }}</span>
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm font-medium">{{ user?.name || 'Account' }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ user?.email }}</span>
            </span>
            <ChevronsUpDownIcon class="size-4 shrink-0 text-muted-foreground" />
          </button>
        </MenuTrigger>
        <MenuPopup align="start" side="top" class="w-(--reka-dropdown-menu-trigger-width) min-w-56">
          <template v-if="orgs && orgs.length > 1">
            <MenuGroupLabel>Teams</MenuGroupLabel>
            <MenuItem v-for="o in orgs" :key="o.id" @select="switchOrg(o.id)">
              <UsersIcon /> <span class="truncate">{{ o.label }}</span>
              <span v-if="o.active" class="ms-auto text-xs text-muted-foreground">Current</span>
            </MenuItem>
            <MenuSeparator />
          </template>
          <MenuItem @select="emit('navigate'); navigateTo('/app/settings')">
            <SettingsIcon /> Settings
          </MenuItem>
          <MenuItem v-if="edition === 'cloud'" @select="emit('navigate'); navigateTo('/app/billing')">
            <CreditCardIcon /> Billing
          </MenuItem>
          <MenuSeparator />
          <MenuItem @select="signOut">
            <LogOutIcon /> Sign out
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  </div>
</template>
