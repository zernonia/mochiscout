import { describe, expect, it } from 'vitest'
import { parsePosts } from '../utils/parse'

describe('parsePosts', () => {
  it('reads new Reddit shreddit-post elements', () => {
    document.body.innerHTML = `
      <shreddit-post id="t3_abc12" post-title="Need a CRM" permalink="/r/SaaS/comments/abc12/need_a_crm/"
        author="founder" subreddit-prefixed-name="r/SaaS" created-timestamp="2026-10-08T10:43:35.123000+0000">
        <div slot="text-body"><p>Spreadsheets are killing us.</p></div>
      </shreddit-post>
      <shreddit-post id="t3_abc12" post-title="dupe" subreddit-prefixed-name="r/SaaS"></shreddit-post>
      <shreddit-post id="ad-1" post-title="Promoted"></shreddit-post>`
    expect(parsePosts(document)).toEqual([{
      fullname: 't3_abc12',
      subreddit: 'r/SaaS',
      title: 'Need a CRM',
      permalink: '/r/SaaS/comments/abc12/need_a_crm/',
      author: 'founder',
      createdAt: '2026-10-08T10:43:35.123000+0000',
      body: 'Spreadsheets are killing us.',
    }])
  })

  it('reads old Reddit listings', () => {
    document.body.innerHTML = `
      <div class="thing link" data-fullname="t3_xyz9" data-subreddit="startups" data-author="maker"
        data-timestamp="1791456215000" data-permalink="/r/startups/comments/xyz9/t/">
        <a class="title">Pricing advice?</a>
      </div>`
    expect(parsePosts(document)).toEqual([{
      fullname: 't3_xyz9',
      subreddit: 'startups',
      title: 'Pricing advice?',
      permalink: '/r/startups/comments/xyz9/t/',
      author: 'maker',
      createdAt: 1791456215000,
      body: null,
    }])
  })
})
