#!/usr/bin/env sh
# Export decided threads (replied, saved, dismissed) with their project profile from the
# production D1, for the scoring eval (packages/core/eval/scoring.eval.ts).
#   apps/web/scripts/export-scoring-labels.sh > labels.json
set -e
cd "$(dirname "$0")/.."
pnpm exec wrangler d1 execute DB --remote --json --command "
SELECT p.id AS project_id, p.name, p.url, p.category, p.icp, p.problems_json, p.competitors_json, p.intent_threshold,
       t.id AS thread_id, t.platform, t.channel, t.title, t.snippet, s.intent, s.status, s.dismiss_reason
FROM thread_scores s
JOIN threads t ON t.id = s.thread_id
JOIN projects p ON p.id = s.project_id
WHERE s.status IN ('replied', 'saved', 'dismissed')"
