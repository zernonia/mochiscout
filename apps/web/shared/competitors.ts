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
  // "Yes" is the risky answer here, so the marks are coloured the other way round.
  { key: 'postsForYou', label: 'Posts, comments or DMs for you', inverted: true },
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
  /** Linked from the site footer: the brands people search for most. */
  footer?: boolean
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
    footer: true,
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
    slug: 'bazzly',
    name: 'Bazzly',
    url: 'https://bazzly.ai',
    verified: '2026-10-12',
    title: 'Bazzly alternative without bought accounts or upvotes: Mochiscout',
    description: 'Bazzly posts Reddit comments through its own aged accounts, adds upvotes and sends DMs, from $199/month. Mochiscout finds the same buyers, drafts replies you post yourself, and costs $19/month.',
    h1: 'A Bazzly alternative that keeps your marketing yours',
    intro: 'Bazzly puts Reddit marketing on autopilot: it finds relevant threads, writes a reply, posts it through one of its "warmed-up" aged accounts, adds "smart upvotes" to push the comment to the top, and can DM people who posted. Mochiscout is built on the opposite bet: that the replies which win customers are the ones you write and post yourself.',
    theirPitch: 'Reddit marketing on autopilot: replies posted through its aged accounts, upvotes, and DMs.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit' },
      finding: { mark: 'yes', note: 'Finds threads where your product fits' },
      drafts: { mark: 'yes' },
      postsForYou: { mark: 'yes', note: 'Posts via its aged accounts, upvotes, DMs' },
      rules: { mark: 'partial', note: 'Warns before posting in strict subreddits' },
      removals: { mark: 'partial', note: 'Refunds credits for comments removed within 48h' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '7-day trial, card required' },
      price: { mark: 'yes', note: '$199/mo for 170 credits' },
      openSource: { mark: 'no' },
      api: { mark: 'yes', note: 'API and MCP' },
    },
    differences: [
      { title: 'Your account, your words', body: 'A recommendation from an account with no history in your niche, boosted with upvotes, is the kind of activity Reddit\'s content policy prohibits as content and vote manipulation. Mochiscout never posts, votes or DMs. You reply from your own account, which builds a reputation that keeps working for you.' },
      { title: 'Readers trust it', body: 'Replies that say "I built this" and actually answer the question convert, and they don\'t disappear in the next spam sweep. Drafts lead with a useful answer and disclose that you made the product.' },
      { title: 'A tenth of the price', body: 'Bazzly is $199 a month per product, with 170 credits (a comment through its accounts costs 10). Mochiscout Solo is $19 a month, and there is a free plan.' },
      { title: 'Beyond Reddit', body: 'Hacker News, Bluesky and X in the same inbox, with subreddit rule checks and removal tracking on everything you post.' },
    ],
    chooseThemIf: [
      'You want replies posted for you without touching Reddit, and accept that they come from accounts that aren\'t yours.',
    ],
    faq: [
      { q: 'Is buying upvotes or using other accounts against Reddit\'s rules?', a: 'Reddit\'s content policy prohibits content manipulation, including vote manipulation and using multiple accounts to promote something. Accounts and domains caught doing it can be banned.' },
      { q: 'Does Bazzly support posting from my own account?', a: 'Yes. Besides its warmed-up accounts, Bazzly has a Chrome extension for posting from your own account. Mochiscout only works that way, without an extension: you copy the reply and post it.' },
    ],
    sources: [
      { label: 'Bazzly', url: 'https://bazzly.ai' },
      { label: 'Bazzly pricing', url: 'https://bazzly.ai/pricing' },
      { label: 'Reddit content policy', url: 'https://redditinc.com/policies/content-policy' },
    ],
  },
  {
    slug: 'f5bot',
    footer: true,
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
    footer: true,
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
    footer: true,
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
  {
    slug: 'redship',
    name: 'RedShip',
    url: 'https://redship.io',
    verified: '2026-10-10',
    title: 'Mochiscout vs RedShip: a RedShip alternative beyond Reddit',
    description: 'RedShip and Mochiscout both score Reddit threads and suggest replies you post yourself. Mochiscout adds Hacker News, Bluesky and X, rule checks before you post, removal tracking and a free plan, from $19/month.',
    h1: 'Mochiscout vs RedShip',
    intro: 'RedShip is a polished Reddit monitor: it scores threads for relevance, suggests replies and adds an SEO angle, with weekly reports on Reddit threads that rank in Google and on AI-search citations. Mochiscout overlaps on the core loop and differs on reach, safety and price.',
    theirPitch: 'Reddit monitoring with AI relevance scoring, reply suggestions, SEO and AI-visibility reports.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit only' },
      finding: { mark: 'yes', note: 'Keywords and competitors you track, AI relevance score' },
      drafts: { mark: 'yes', note: 'AI reply suggestions' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'partial', note: 'Free standalone rules checker' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '$12 seven-day pass' },
      price: { mark: 'yes', note: '$29/mo, billed yearly' },
      openSource: { mark: 'no' },
      api: { mark: 'partial', note: 'Webhooks on Company plan' },
    },
    differences: [
      { title: 'Four platforms, not one', body: 'The same buyers ask on Hacker News, Bluesky and X. Mochiscout puts all four in one ranked inbox.' },
      { title: 'Rules checked inside the workflow', body: 'Promotion rules, cooldowns and a daily cap are checked on every draft before you post, and the tracker tells you if a post or reply was removed.' },
      { title: 'No keyword list to babysit', body: 'Mochiscout builds its search from your landing page and suggests around 30 buyer phrases. RedShip plans cap tracked keywords at 10 or 30.' },
      { title: 'Free to start, $19 monthly', body: 'A free plan, and Solo at $19 billed monthly, against RedShip\'s $29 billed yearly.' },
    ],
    chooseThemIf: [
      'You want weekly reports on Reddit threads ranking in Google and on how AI assistants cite your brand.',
      'You only care about Reddit and want Slack alerts out of the box.',
    ],
    faq: [
      { q: 'Do both tools leave posting to me?', a: 'Yes. Both suggest replies and leave posting to you, from your own account.' },
    ],
    sources: [{ label: 'RedShip pricing', url: 'https://redship.io/pricing' }],
  },
  {
    slug: 'redreach',
    name: 'Redreach',
    url: 'https://redreach.ai',
    verified: '2026-10-10',
    title: 'Redreach alternative without DM automation: Mochiscout',
    description: 'Redreach finds high-intent Reddit threads and sells a bulk DM automation add-on. Mochiscout finds buyers on Reddit, Hacker News, Bluesky and X, drafts replies you post yourself, and never DMs anyone.',
    h1: 'A Redreach alternative that never DMs on your behalf',
    intro: 'Redreach finds Reddit threads with purchase intent, especially ones that rank on Google, and suggests replies you post from your own account. It also sells "Redreach Outbound", a Chrome extension that sends bulk DMs to Reddit users. Mochiscout shares the first half of that philosophy and stops there.',
    theirPitch: 'Reddit lead generation focused on Google-ranking threads, with AI-guided replies and an optional bulk-DM extension.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit only' },
      finding: { mark: 'yes', note: 'AI relevance score from your site and competitors' },
      drafts: { mark: 'yes', note: 'AI-guided replies' },
      postsForYou: { mark: 'partial', note: 'No auto-posting; bulk DM extension sold separately' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: 'One-time 3-day pass' },
      price: { mark: 'partial', note: 'Not listed on its site' },
      openSource: { mark: 'no' },
      api: { mark: 'yes', note: 'Webhooks; API and MCP' },
    },
    differences: [
      { title: 'No DMs, ever', body: 'Unsolicited DMs are one of the fastest ways to get a Reddit account suspended, and they annoy the people you want as customers. Mochiscout only helps you reply in public.' },
      { title: 'Rules and removal tracking', body: 'Every draft is checked against the subreddit\'s promotion rules, cooldowns and a daily cap, and the tracker tells you if your post or reply was removed.' },
      { title: 'Beyond Reddit', body: 'Hacker News, Bluesky and X in the same inbox.' },
      { title: 'Transparent pricing and a free plan', body: 'Free, $19 and $49 a month, listed on the pricing page. Self-hosting is free.' },
    ],
    chooseThemIf: [
      'Your strategy is mainly Reddit threads that already rank on Google (parasite SEO).',
      'You want outbound DMs and accept the account risk.',
    ],
    faq: [
      { q: 'Does Redreach auto-post?', a: 'No. Redreach says it does not auto-post comments; you post from your own account. Its separate Outbound extension automates DMs.' },
    ],
    sources: [{ label: 'Redreach', url: 'https://redreach.ai' }],
  },
  {
    slug: 'pulse',
    name: 'Pulse for Reddit',
    url: 'https://usepulse.ai',
    verified: '2026-10-10',
    title: 'Mochiscout vs Pulse for Reddit: lead tools compared',
    description: 'Pulse and Mochiscout both score Reddit posts and draft replies. Mochiscout covers Hacker News, Bluesky and X too, checks subreddit rules, tracks removals and has no lead quotas, from $19/month.',
    h1: 'Mochiscout vs Pulse for Reddit',
    intro: 'Pulse scores Reddit posts for intent, fit and timing, drafts replies and tracks how AI assistants mention your brand. Plans are built around monthly quotas of scored and qualified leads. Here is how it compares.',
    theirPitch: 'AI-scored Reddit lead generation with reply drafting and AI-visibility tracking, priced by lead quota.',
    cells: {
      platforms: { mark: 'partial', note: 'Reddit' },
      finding: { mark: 'yes', note: 'AI scoring of keyword matches' },
      drafts: { mark: 'yes', note: 'Monthly drafting limit' },
      postsForYou: { mark: 'no', note: 'Done-for-you engagement on Enterprise' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'yes', note: 'Free plan, 30-day retention' },
      price: { mark: 'yes', note: '$29/mo ($19/mo yearly)' },
      openSource: { mark: 'no' },
      api: { mark: 'no' },
    },
    differences: [
      { title: 'No lead quotas', body: 'Pulse Starter caps qualified leads at about 150 a month. Mochiscout plans limit projects and subreddits, not how many leads you may look at.' },
      { title: 'Four platforms', body: 'Hacker News, Bluesky and X alongside Reddit.' },
      { title: 'Rules and removals', body: 'Promotion rules checked before you post, and a tracker for removed posts and replies.' },
      { title: 'Open source', body: 'Run your own copy free on Cloudflare, or use the hosted plans.' },
    ],
    chooseThemIf: [
      'You want AI-visibility tracking (how ChatGPT and others mention you).',
      'You want an agency to run Reddit engagement for you (Pulse Enterprise).',
    ],
    faq: [],
    sources: [{ label: 'Pulse pricing', url: 'https://usepulse.ai/pricing' }],
  },
  {
    slug: 'octolens',
    footer: true,
    name: 'Octolens',
    url: 'https://octolens.com',
    verified: '2026-10-10',
    title: 'Octolens alternative for founders: Mochiscout from $19/month',
    description: 'Octolens is brand monitoring for B2B and developer tools from $159/month. Mochiscout finds buying-intent posts on Reddit, Hacker News, Bluesky and X and drafts replies, with a free plan and $19 Solo plan.',
    h1: 'An Octolens alternative built for solo founders',
    intro: 'Octolens monitors mentions of your brand and keywords across a long list of sources, from Reddit and Hacker News to LinkedIn, GitHub and podcasts, and rates each for relevance with tags such as buy intent. It is priced for teams. Mochiscout is narrower and priced for founders.',
    theirPitch: 'Brand and keyword monitoring for B2B and developer tools across many sources, with AI relevance and sentiment.',
    cells: {
      platforms: { mark: 'yes', note: 'Reddit, HN, X, Bluesky, LinkedIn, GitHub, TikTok and more' },
      finding: { mark: 'yes', note: 'AI relevance rating and intent tags' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '7-day trial' },
      price: { mark: 'yes', note: '$159/mo, billed yearly' },
      openSource: { mark: 'no' },
      api: { mark: 'yes', note: 'API, webhooks and MCP' },
    },
    differences: [
      { title: 'A fraction of the price', body: 'Free to start and $19 a month for Solo, against $159 a month billed yearly.' },
      { title: 'From finding to replying', body: 'Drafted replies that read the thread, rule checks before you post, and tracking of what got removed.' },
      { title: 'Built for buyers, not mentions', body: 'Every post is scored for whether the person wants something like your product, not just whether they said a keyword.' },
    ],
    chooseThemIf: [
      'You need brand monitoring across LinkedIn, GitHub, YouTube, podcasts and news.',
      'You are a team that needs sentiment tracking and integrations at scale.',
    ],
    faq: [],
    sources: [{ label: 'Octolens pricing', url: 'https://octolens.com/pricing' }],
  },
  {
    slug: 'kwatch',
    name: 'KWatch.io',
    url: 'https://kwatch.io',
    verified: '2026-10-10',
    title: 'KWatch.io alternative with AI intent scoring: Mochiscout',
    description: 'KWatch.io sends keyword alerts from Reddit, Hacker News, X and more. Mochiscout scores every post for buying intent, covers Bluesky, drafts replies and checks subreddit rules, at the same $19/month.',
    h1: 'A KWatch.io alternative that scores intent for you',
    intro: 'KWatch.io is an affordable keyword alert tool for Reddit, Hacker News, X, YouTube, LinkedIn and Facebook groups, with AI sentiment. You write the keywords, including intent phrases like "looking for". Mochiscout costs the same and does that part for you.',
    theirPitch: 'Keyword alerts across social platforms with AI sentiment analysis.',
    cells: {
      platforms: { mark: 'yes', note: 'Reddit, HN, X, YouTube, LinkedIn, Facebook groups' },
      finding: { mark: 'partial', note: 'Keyword alerts you configure; AI sentiment' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'yes', note: '2 alerts each on Reddit and HN' },
      price: { mark: 'yes', note: '$19/mo' },
      openSource: { mark: 'no' },
      api: { mark: 'partial', note: 'API, webhooks and MCP from $79/mo' },
    },
    differences: [
      { title: 'Intent instead of keywords', body: 'Each post gets a buying-intent score and a reason, so "looking for" phrasing in a hundred variations isn\'t on you.' },
      { title: 'Bluesky included', body: 'Many indie founders\' buyers moved to Bluesky. Mochiscout covers it alongside Reddit, HN and X.' },
      { title: 'Replies and rules', body: 'Drafted replies, subreddit rule checks and removal tracking at the same $19.' },
    ],
    chooseThemIf: [
      'You need YouTube, LinkedIn or Facebook group alerts.',
      'You want simple keyword alerts and nothing more.',
    ],
    faq: [],
    sources: [{ label: 'KWatch.io pricing', url: 'https://kwatch.io/pricing' }],
  },
  {
    slug: 'brand24',
    footer: true,
    name: 'Brand24',
    url: 'https://brand24.com',
    verified: '2026-10-10',
    title: 'Brand24 alternative for finding customers on Reddit: Mochiscout',
    description: 'Brand24 is an enterprise social listening suite from $199/month. If you want buyers on Reddit, Hacker News, Bluesky and X rather than brand analytics, Mochiscout does that from $19/month.',
    h1: 'A Brand24 alternative for founders who want customers, not reports',
    intro: 'Brand24 is a full social listening suite: mentions across the web, sentiment, reach and AI insights for marketing teams. Reddit is one source of many. If what you need is people asking for a product like yours, you are paying for a lot you won\'t use.',
    theirPitch: 'Enterprise social listening: mentions, sentiment, reach and AI insights across the web.',
    cells: {
      platforms: { mark: 'yes', note: 'Web, news, social and Reddit' },
      finding: { mark: 'partial', note: 'Mention monitoring with sentiment' },
      drafts: { mark: 'no' },
      postsForYou: { mark: 'no' },
      rules: { mark: 'no' },
      removals: { mark: 'no' },
      closed: { mark: 'no' },
      free: { mark: 'no', note: '14-day trial' },
      price: { mark: 'yes', note: '$199/mo, billed yearly' },
      openSource: { mark: 'no' },
      api: { mark: 'yes' },
    },
    differences: [
      { title: 'Leads, not analytics', body: 'An inbox of people ready to buy, ranked by intent and freshness, instead of mention volume and sentiment charts.' },
      { title: 'Help with the reply', body: 'Drafts that read the whole thread, checked against the community\'s rules, posted by you.' },
      { title: 'Ten times cheaper', body: 'Free to start and $19 a month, against $199 a month billed yearly.' },
    ],
    chooseThemIf: [
      'You need brand reputation monitoring, sentiment and reach analytics across the whole web.',
      'You report on share of voice to a marketing team.',
    ],
    faq: [],
    sources: [{ label: 'Brand24 pricing', url: 'https://brand24.com/prices/' }],
  },
]

export function findCompetitor(slug: string) {
  return COMPETITORS.find(c => c.slug === slug) ?? null
}
