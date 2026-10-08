export default defineEventHandler(async (event) => {
  const { project } = await requireProject(event)
  return project
})
