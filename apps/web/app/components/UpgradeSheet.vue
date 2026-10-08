<script setup lang="ts">
import type { UpgradePrompt } from '~/plugins/upgrade.client'

const prompt = useState<UpgradePrompt | null>('upgrade-prompt', () => null)
const open = computed({
  get: () => prompt.value !== null,
  set: (v) => { if (!v) prompt.value = null },
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="bottom" class="mx-auto max-w-lg rounded-t-xl">
      <SheetHeader>
        <SheetTitle>{{ prompt?.upgradeToLabel ? `Upgrade to ${prompt.upgradeToLabel}` : 'Plan limit reached' }}</SheetTitle>
        <SheetDescription>{{ prompt?.message }}</SheetDescription>
      </SheetHeader>
      <div class="flex flex-col gap-2 px-4 pb-6">
        <Button v-if="prompt?.upgradeTo" as-child @click="prompt = null">
          <NuxtLink :to="`/app/billing?plan=${prompt.upgradeTo}`">
            Upgrade to {{ prompt.upgradeToLabel }}{{ prompt.upgradeToPrice ? ` · $${prompt.upgradeToPrice}/mo` : '' }}
          </NuxtLink>
        </Button>
        <Button variant="ghost" @click="prompt = null">Not now</Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
