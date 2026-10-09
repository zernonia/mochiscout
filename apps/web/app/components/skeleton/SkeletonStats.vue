<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
    <div v-for="i in 4" :key="i" class="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4">
      <div class="flex items-center justify-between"><Skeleton class="h-4 w-20" /><Skeleton class="size-7 rounded-md" /></div>
      <Skeleton class="h-7 w-12" />
      <Skeleton class="h-3 w-28" />
    </div>
  </div>
</template>
