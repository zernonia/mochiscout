/**
 * Comparison pages (/alternatives/<slug>). Facts about other products come
 * from their own sites on the date in `verified`; re-check before editing,
 * and keep claims sourced and fair: pages that overstate lose trust (and rank).
 */

export type Mark = 'yes' | 'no' | 'partial'
export interface Cell { mark: Mark, note?: string }

/** Rows compared on every page, in this order. */
export const FEATURES = [
  { key: 'platforms', label: 'Platforms' },
  { key: 'finding', label: 'How posts are found' },
  { key: 'drafts', label: 'AI reply drafts' },
  { key: 'postsForYou', label: 'Posts, comments or DMs for you' },
  { key: 'rules', label: 'Subreddit rule checks' },
  { key: 'removals', label: 'Removed-post tracking' },
  { key: 'closed', label: 'Flags archived or locked threads' },
  { key: 'free', label: 'Free plan' },
  { key: 'price', label: 'Paid plans from' },
  { key: 'openSource', label: 'Open source, self-hostable' },
  { key: 'api', label: 'API / MCP for AI agents' },
] as const

export type FeatureKey = typeof FEATURES[number]['key']

export const MOCHISCOUT: Record<FeatureKey, Cell> = {
  platforms: { mark: 'yes', note: 'Reddit, Hacker News, Bluesky, X' },
  finding: { mark: 'yes', note: 'AI buying-intent score on every post, from your product URL' },
  drafts: { mark: 'yes', note: 'Reads the whole thread; learns your voice' },
  postsForYou: { mark: 'no', note: 'Never. You post from your own account' },
  rules: { mark: 'yes', note: 'Promo rules, cooldowns, daily cap' },
  removals: { mark: 'yes', note: 'Removed, filtered and shadowbanned' },
  closed: { mark: 'yes', note: 'Archived, locked and deleted threads flagged' },
  free: { mark: 'yes', note: '1 project, 3 subreddits' },
  price: { mark: 'yes', note: '$19/mo' },
  openSource: { mark: 'yes', note: 'AGPL, runs on your Cloudflare account' },
  api: { mark: 'yes', note: 'MCP server on Pro' },
}

export interface Competitor {
  slug: string
  name: string
  url: string
  /** Date the facts below were checked on the competitor's site. */
  verified: string
  /** Shown above the fold when the product has closed or is closing. */
  notice?: string
  /** <title> and meta description. */
  title: string
  description: string
  h1: string
  intro: string
  /** One-line, fair summary of what they are. */
  theirPitch: string
  cells: Record<FeatureKey, Cell>
  /** Where Mochiscout is different, strongest first. */
  differences: { title: string, body: string }[]
  /** "What you used X for, and where it lives here" (for products people are leaving). */
  mapping?: { need: string, how: string }[]
  /** Honest: reasons to pick them instead. */
  chooseThemIf: string[]
  faq: { q: string, a: string }[]
  sources: { label: string, url: string }[]
}

export const COMPETITORS: Competitor[] = [
  {
    slug: 'gummysearch',
    name: 'GummySearch',
    url: 'https://gummysearch.com',
    verified: '2026-10-10',
    notice: 'GummySearch stopped taking new sign-ups and renewals on November 30, 2025. It shuts down entirely on December 1, 2026, and all user data is deleted then. Download anything you need before that date.',
    title: 'Best GummySearch alternative (2026): Mochiscout',
    description: 'GummySearch shuts down on December 1, 2026. Mochiscout finds the Reddit threads where people ask for what you sell, plus Hacker News, Bluesky and X, without the Reddit Data API. Free plan, open source.',
    h1: 'The GummySearch alternative for finding customers on Reddit',
    intro: 'GummySearch helped more than 135,000 founders and marketers understand their audience on Reddit. It closed to new customers because it could not reach a commercial agreement under Reddit\'s Data API policies, and it shuts down on December 1, 2026. Mochiscout covers the part of that workflow that turns into customers: finding the threads where people ask for what you built, and helping you answer them well.',
    theirPitch: 'Reddit audience research: subreddit audiences, themes like Pain Points and Solution Requests, and keyword tracking.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit only' },
      finding: { mark: 'partial', note: 'Themes (Pain Points, Solution Requests…) and keyword tracking' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: 'Ended November 30, 2025' },
      price: { mark: 'no', note: 'Was $29–$199/mo; no longer sold' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'It doesn\'t depend on the Reddit Data API', body: 'GummySearch closed because its API access couldn\'t be licensed. Mochiscout reads public feeds politely and uses web search for discovery, so there is no API license to lose. Self-hosters run it on their own account and IP.' },
      { title: 'From research to replies', body: 'Instead of a search box, you get an inbox of posts scored for buying intent, a drafted reply that has read the whole thread, and a check against the subreddit\'s rules before you post.' },
      { title: 'More than Reddit', body: 'The same feed covers Hacker News, Bluesky and X, where many of the same buyers ask the same questions.' },
      { title: 'Open source, so it can\'t disappear on you', body: 'Mochiscout is AGPL-licensed. If the hosted service ever changed, you could keep running it yourself.' },
    ],
    mapping: [
      { need: 'Pain Points and Solution Requests', how: 'Research groups recent threads into pain points, each linked to the threads behind it. Solution requests land in your inbox, scored for buying intent.' },
      { need: 'Audiences (subreddit collections)', how: 'Paste your URL and the subreddit map ranks communities by how often your buyers post there, with each sub\'s promotion rules.' },
      { need: 'Keyword tracking and alerts', how: 'Keywords and competitors from your landing page are matched against every new post, and hot leads can email you within the hour.' },
      { need: 'Seeking Alternatives', how: 'Posts that name a competitor are scored as comparisons or complaints, and the draft says fairly how you differ.' },
      { need: 'Slack / Discord / daily digest', how: 'A daily digest email with the top threads and one post idea; an MCP server lets AI agents read your inbox.' },
    ],
    chooseThemIf: [
      'You need deep audience research across a whole Reddit archive (pain-point themes over years of posts). Mochiscout looks at new posts in the communities you watch plus older threads that still rank in search.',
    ],
    faq: [
      { q: 'When does GummySearch shut down?', a: 'GummySearch stopped accepting new sign-ups on November 30, 2025. Existing accounts keep working until December 1, 2026, when the service closes and its data is deleted.' },
      { q: 'Why did GummySearch close?', a: 'Its founder wrote that GummySearch "was not able to reach an agreement that aligns with Reddit\'s Data API Usage policies", so it had to become non-commercial or shut down.' },
      { q: 'Can I still use GummySearch until then?', a: 'Existing paid customers keep access until their current billing period ends (nothing renews), and lifetime-deal holders until November 30, 2026. Free accounts can only log in to download or delete their data.' },
      { q: 'Could the same thing happen to Mochiscout?', a: 'Mochiscout does not use the Reddit Data API. It reads Reddit\'s public feeds at a polite rate and finds older threads through web search. And because it is open source, you can always run your own copy.' },
      { q: 'Can I import my GummySearch audiences?', a: 'Not automatically. Paste your product URL and Mochiscout suggests the subreddits, keywords and competitors to watch in about a minute; you can add the subreddits from your GummySearch collections by hand.' },
      { q: 'Is there a free plan?', a: 'Yes: one project and three watched subreddits with a weekly digest. Paid plans start at $19/month, and self-hosting is free.' },
    ],
    sources: [
      { label: 'The Final Chapter for GummySearch (founder\'s announcement)', url: 'https://gummysearch.com/final-chapter/' },
      { label: 'GummySearch is now closed (help article)', url: 'https://gummysearch.com/docs/articles/gummysearch-is-now-closed-6533h' },
      { label: 'GummySearch pricing (last published)', url: 'https://gummysearch.com/pricing' },
    ],
  },
  {
    slug: 'ownfeed',
    name: 'Ownfeed',
    url: 'https://ownfeed.dev',
    verified: '2026-10-10',
    title: 'Mochiscout vs Ownfeed: an Ownfeed alternative with reply drafts',
    description: 'Ownfeed and Mochiscout both find people who need your product on Reddit, X, Bluesky and Hacker News. Mochiscout adds intent scores, reply drafts, subreddit rule checks and a free plan, from $19/month.',
    h1: 'Mochiscout vs Ownfeed',
    intro: 'Ownfeed and Mochiscout start the same way: paste your product URL and get a feed of people who need what you built, on Reddit, X, Bluesky and Hacker News. Neither posts for you. The difference is what happens after you find a thread.',
    theirPitch: 'A daily social feed of people who need your product, built from your URL.',
    cells: {
      platforms: { mark: 'yes', note: 'Reddit, X, Bluesky, HN; more in beta on the 3-month plan' },
      finding: { mark: 'yes', note: 'AI-generated search terms and filtering' },
      drafts: { mark: 'no', note: '"You write the replies, not an AI"' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '$1 trial' },
      price: { mark: 'yes', note: '$39/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'A score on every post', body: 'Each post gets a buying-intent score and a short reason, and the inbox ranks fresh, uncrowded threads first, so you know which ten to open.' },
      { title: 'Drafts you edit, not write from scratch', body: 'Mochiscout drafts a reply after reading the full post and the replies so far, then learns your voice from the replies you actually post. You still edit and post it yourself.' },
      { title: 'Don\'t get banned', body: 'Subreddit promotion rules, per-sub cooldowns and a daily promo cap are checked before you post, and the tracker tells you if a post was removed.' },
      { title: 'Cheaper, with a free plan', body: 'Solo is $19/month against Ownfeed\'s $39, and there is a free plan.' },
    ],
    chooseThemIf: [
      'You want beta coverage of LinkedIn, Threads, TikTok, Instagram, YouTube or Product Hunt.',
      'You prefer to write every reply yourself and want no AI involvement in replies at all.',
    ],
    faq: [
      { q: 'Does either tool post for me?', a: 'No. Both leave posting to you, from your own account.' },
      { q: 'How fresh is the feed?', a: 'Mochiscout checks watched subreddits every 15 minutes to a few hours depending on activity, and can email you hot leads within the hour. Ownfeed\'s plan describes a daily timeline.' },
    ],
    sources: [
      { label: 'Ownfeed', url: 'https://ownfeed.dev' },
    ],
  },
  {
    slug: 'f5bot',
    name: 'F5Bot',
    url: 'https://f5bot.com',
    verified: '2026-10-10',
    title: 'F5Bot alternative with AI buying-intent scoring: Mochiscout',
    description: 'F5Bot emails you every keyword mention on Reddit and Hacker News. Mochiscout scores each post for buying intent, adds Bluesky and X, and drafts a reply you post yourself. Free plan available.',
    h1: 'An F5Bot alternative that only shows posts worth answering',
    intro: 'F5Bot is the free tool most founders start with: pick keywords, get an email whenever they appear on Reddit, Hacker News or Lobsters. It is great at what it does. The catch is volume: a keyword match is not a buyer, and the inbox fills up with noise.',
    theirPitch: 'Free keyword alerts for Reddit, Hacker News and Lobsters, by email.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit, Hacker News, Lobsters' },
      finding: { mark: 'partial', note: 'Keyword matches; AI filtering on the $49.99 plan' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'yes', note: 'Free forever' },
      price: { mark: 'yes', note: '$9.99/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'Intent, not keyword matches', body: 'Mochiscout reads every matching post and scores whether the person is actually looking for something like your product, with a reason. You see the 5% worth answering, not every mention.' },
      { title: 'No keyword list to maintain', body: 'Paste your URL and Mochiscout suggests keywords, competitors and around 30 phrases your buyers use.' },
      { title: 'Bluesky and X too', body: 'The same buyers ask on Bluesky and X; Mochiscout covers both alongside Reddit and Hacker News.' },
      { title: 'Help with the reply', body: 'Draft a reply that has read the thread, checked against the subreddit\'s rules, then post it yourself.' },
    ],
    chooseThemIf: [
      'You just want free email alerts for exact keywords, such as your brand name.',
      'You need Lobsters coverage.',
    ],
    faq: [
      { q: 'Can I use both?', a: 'Yes. Many people keep F5Bot for brand-name alerts and use Mochiscout to find buyers who never mention a brand.' },
    ],
    sources: [{ label: 'F5Bot', url: 'https://f5bot.com' }],
  },
  {
    slug: 'syften',
    name: 'Syften',
    url: 'https://syften.com',
    verified: '2026-10-10',
    title: 'Syften alternative with AI intent scoring and reply drafts: Mochiscout',
    description: 'Syften monitors keywords across dozens of communities. Mochiscout scores Reddit, Hacker News, Bluesky and X posts for buying intent, includes X at no extra cost and drafts replies, from $19/month.',
    h1: 'A Syften alternative for finding buyers, not mentions',
    intro: 'Syften is a mature keyword monitor that covers more communities than almost anyone, from Reddit and Hacker News to Slack groups, GitHub and newsletters. You write the filters and it alerts you. Mochiscout is narrower and goes further on the part that turns into customers.',
    theirPitch: 'Keyword monitoring and alerts across many online communities.',
    cells: {
      platforms: { mark: 'yes', note: 'Many communities; X is +$40/mo' },
      finding: { mark: 'partial', note: 'Keyword filters you write; AI spam filtering' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '14-day trial' },
      price: { mark: 'yes', note: '$29.95/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'yes', note: 'API, webhooks, MCP' },
    },
    differences: [
      { title: 'No filters to write', body: 'Mochiscout builds its search from your landing page and scores every post for buying intent, so you don\'t tune boolean filters.' },
      { title: 'X included', body: 'X is part of the Pro plan rather than a $40/month add-on.' },
      { title: 'Reply help and ban protection', body: 'Drafted replies, subreddit rule checks and removal tracking, none of which a monitor does.' },
    ],
    chooseThemIf: [
      'You need coverage of Slack communities, GitHub, Stack Exchange, newsletters or podcasts.',
      'You want precise, rule-based alerts you control completely.',
    ],
    faq: [
      { q: 'Is Mochiscout a social listening tool?', a: 'Not really. It is built to find people asking for what you sell and help you reply. For broad brand monitoring across many sources, Syften is the better fit.' },
    ],
    sources: [{ label: 'Syften pricing', url: 'https://syften.com/pricing' }],
  },
  {
    slug: 'replyguy',
    name: 'ReplyGuy',
    url: 'https://replyguy.com',
    verified: '2026-10-10',
    title: 'ReplyGuy alternative that never posts for you: Mochiscout',
    description: 'ReplyGuy can auto-reply on your behalf. Mochiscout finds the same buying-intent threads on Reddit and X, drafts a reply that fits the thread and the subreddit rules, and leaves posting to you.',
    h1: 'A ReplyGuy alternative that keeps your accounts safe',
    intro: 'ReplyGuy finds places to mention your product on Reddit and X and, on its Pro plan and up, can post replies automatically. Automated promotional replies are exactly what Reddit\'s moderators and spam filters look for. Mochiscout takes the opposite approach.',
    theirPitch: 'AI that finds places to mention your product online, with optional auto-replies.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit, X' },
      finding: { mark: 'yes', note: 'AI keyword and relevance matching' },
      drafts: { mark: 'yes' },
      postsForYou: { mark: 'yes', note: 'Auto-replies on Pro and up' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: 'Free trial' },
      price: { mark: 'yes', note: '$39/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'You post, always', body: 'Mochiscout never posts, comments, votes or sends DMs. Replies come from your own account, in your words, which is what communities reward.' },
      { title: 'Rules before you post', body: 'Every subreddit\'s promotion rules, account-age and karma limits are checked, with per-sub cooldowns and a daily promo cap.' },
      { title: 'Know when something goes wrong', body: 'The tracker checks whether your posts were removed or filtered, and whether your account looks shadowbanned.' },
    ],
    chooseThemIf: [
      'You want replies posted automatically and accept the account risk.',
    ],
    faq: [
      { q: 'Is auto-posting on Reddit against the rules?', a: 'Reddit\'s rules prohibit spam and inauthentic engagement, and most subreddits restrict self-promotion. Automated promotional replies are a common reason accounts and domains get banned.' },
    ],
    sources: [{ label: 'ReplyGuy', url: 'https://replyguy.com' }],
  },
  {
    slug: 'subreddit-signals',
    name: 'Subreddit Signals',
    url: 'https://www.subredditsignals.com',
    verified: '2026-10-10',
    title: 'Mochiscout vs Subreddit Signals: Reddit lead tools compared',
    description: 'Subreddit Signals and Mochiscout both rank Reddit posts by buyer intent and draft replies. Mochiscout adds Hacker News, Bluesky and X, subreddit rule checks, a free plan and open source, from $19/month.',
    h1: 'Mochiscout vs Subreddit Signals',
    intro: 'Both tools find Reddit posts from likely buyers, rank them by intent and draft a reply in your voice that you post yourself. Here is where they differ.',
    theirPitch: 'Reddit-only customer discovery with intent ranking and voice-profile drafts.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit only' },
      finding: { mark: 'yes', note: 'Fit and buyer-intent ranking' },
      drafts: { mark: 'yes', note: 'Voice profile' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '14-day trial, card required' },
      price: { mark: 'yes', note: '$29/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'Four platforms', body: 'Hacker News, Bluesky and X alongside Reddit, in one ranked inbox.' },
      { title: 'Rules and removal tracking', body: 'Promotion rules, cooldowns and a daily cap are checked before you post; the tracker tells you if a post was removed.' },
      { title: 'No lead tokens', body: 'Plans limit projects and subreddits, not how many leads you may look at.' },
      { title: 'Free plan, lower price, open source', body: 'Start free, Solo is $19/month, and you can self-host the AGPL code.' },
    ],
    chooseThemIf: [
      'You want a managed, done-for-you service (they offer one from $2,000/month).',
    ],
    faq: [],
    sources: [{ label: 'Subreddit Signals', url: 'https://www.subredditsignals.com' }],
  },
]

export function findCompetitor(slug: string) {
  return COMPETITORS.find(c => c.slug === slug) ?? null
}
