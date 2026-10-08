import { z } from 'zod'

const list = (max: number) => z.array(z.string().trim().min(1).max(100)).max(max).default([])

export const ProjectInput = z.object({
  url: z.string().trim().url().max(2048),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(100).nullish(),
  icp: z.string().trim().max(1000).nullish(),
  problems: list(12),
  keywords: list(30),
  competitors: list(12),
})
