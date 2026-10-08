<script setup lang="ts">
export interface ProjectProfile {
  url: string
  name: string
  category: string
  icp: string
  problems: string[]
  keywords: string[]
  competitors: string[]
}

const profile = defineModel<ProjectProfile>({ required: true })

const lists = [
  { key: 'problems', label: 'Problems it solves', hint: 'How a frustrated user would describe them.' },
  { key: 'keywords', label: 'Keywords', hint: 'What buyers type when looking for a tool like yours.' },
  { key: 'competitors', label: 'Competitors', hint: 'Used for "alternative to …" searches.' },
] as const
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="grid gap-5 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for="name">Product name</Label>
        <Input id="name" v-model="profile.name" required />
      </div>
      <div class="flex flex-col gap-2">
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
</template>
