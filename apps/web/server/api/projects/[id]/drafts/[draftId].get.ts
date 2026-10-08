export default defineEventHandler(async event => (await requireDraft(event)).draft)
