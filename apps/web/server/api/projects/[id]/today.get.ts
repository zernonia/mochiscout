import { buildToday } from '@mochiscout/core'

export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  return buildToday(getDb(event), project)
})
