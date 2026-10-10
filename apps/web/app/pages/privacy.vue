<template>
  <LandingLegalPage title="Privacy Policy" description="What Mochiscout collects, why, who processes it, and how to delete it.">
    <p>
      This policy explains how {{ site.operator }} ("we", "us") handles personal data when you use Mochiscout at
      <a :href="site.url">{{ site.url.replace('https://', '') }}</a> (the "Service"). If you run your own copy of the open-source
      code, you are the operator of that copy and this policy does not apply to it.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Account data:</strong> your email address, name and, if you sign in with GitHub or Google, your account ID and profile picture from that provider. If you sign up with a password, we store only a salted hash of it.</li>
      <li><strong>Project data:</strong> the product URL you enter, the profile we draft from your public web page (description, audience, keywords, competitors), the communities you watch, your drafts and the posts you ask us to track.</li>
      <li><strong>Settings:</strong> time zone, digest preferences and, if you add it, your public Reddit username, which we use to check your account's public standing.</li>
      <li><strong>Billing data:</strong> your plan and subscription status. Payments are handled by Polar; we never see or store card details.</li>
      <li><strong>Technical data:</strong> standard request logs (IP address, user agent, time) kept by our hosting provider for security and debugging.</li>
      <li><strong>Usage data:</strong> which pages you visit and features you use, your browser and device type, and approximate location from your IP address, collected with PostHog so we can see how the Service is used and improve it. When you are signed in, these events are linked to your account ID, email and name.</li>
    </ul>

    <h2>Public posts we process</h2>
    <p>
      To build your feed, the Service reads publicly available posts from Reddit, Hacker News, Bluesky and X through public feeds or official APIs.
      We store the post's link, title, text, author handle and public engagement counts, plus a few of its top public replies (with their authors' handles) for the posts you may answer, so you can review them and draft a reply that fits the conversation. We do not collect private
      messages, do not log in to any social network as anyone, and do not build profiles of the people who wrote those posts. Posts that no project
      found relevant are deleted after 90 days.
    </p>

    <h2>Pooled community statistics</h2>
    <p>
      To make rule checks better for everyone, we combine outcomes across all users into anonymous counts per community: for example, how many
      checked posts in a subreddit were removed, or how many replies containing a link stayed up. These counts never identify you, your project or
      your posts, and we publish them on public subreddit pages. Rules we read from a community's pinned public posts are published the same way.
    </p>

    <h2>Tracking links on your site</h2>
    <p>
      If you add our tracking script to your own website, it reports only that a visit or sign-up arrived through one of your Mochiscout tracking links
      (a link containing <code>ref=ms_…</code>). It sets no cookies, stores no IP addresses, and remembers the link for 30 days in the visitor's browser
      storage. You are responsible for describing it in your own site's privacy policy.
    </p>

    <h2>How we use it</h2>
    <ul>
      <li>To run the Service: find and score relevant posts, draft and check replies, send your digest and team invites.</li>
      <li>To bill you and enforce plan limits.</li>
      <li>To keep the Service secure and fix problems.</li>
      <li>To reply when you contact us.</li>
    </ul>
    <p>We do not sell your data, use it for advertising, or share it with data brokers. We use PostHog for product analytics only, never for advertising.</p>

    <h2>Cookies</h2>
    <p>
      We use two strictly necessary cookies: an encrypted session cookie that keeps you signed in, and a cookie that remembers which team you
      have selected. PostHog stores an analytics identifier in a cookie and in your browser's local storage so visits can be counted. There are
      no advertising cookies. You can block analytics with your browser's privacy settings or an ad blocker; the Service keeps working.
    </p>

    <h2>Service providers</h2>
    <p>We share data only with providers that help us run the Service, and only what each needs:</p>
    <ul>
      <li><strong>Cloudflare:</strong> hosting, database, caching and transactional email.</li>
      <li><strong>Anthropic:</strong> AI processing of your product profile, public posts and drafts. Anthropic does not train its models on data sent through its API by default.</li>
      <li><strong>TinyFish and Brave:</strong> web search. We send search terms derived from your product profile, not your personal details.</li>
      <li><strong>X:</strong> official API used to search public posts (Pro plan).</li>
      <li><strong>Polar:</strong> payments, invoices, tax and subscription management, as merchant of record.</li>
      <li><strong>GitHub and Google:</strong> sign-in, if you choose them.</li>
      <li><strong>Resend:</strong> backup email delivery if our primary email provider is unavailable.</li>
      <li><strong>PostHog:</strong> product analytics (United States).</li>
    </ul>
    <p>Some of these providers process data outside your country, including in the United States.</p>

    <h2>Retention and deletion</h2>
    <p>
      We keep your account and project data while your account is open. To delete a project, or your account and all associated data,
      email <a :href="`mailto:${site.supportEmail}`">{{ site.supportEmail }}</a> from the address you signed up with;
      we will do it within 30 days. Billing records are kept as long as tax law requires.
    </p>

    <h2>Your rights</h2>
    <p>
      Depending on where you live, you may have the right to access, correct, export or delete your personal data, and to object to or restrict
      how we process it. Email us and we will respond within 30 days. You can also complain to your local data protection authority.
    </p>

    <h2>Security</h2>
    <p>
      Data is encrypted in transit. Passwords are hashed, API keys are stored only as hashes, and session cookies are encrypted. No system is
      perfectly secure, but we take reasonable steps to protect your data.
    </p>

    <h2>Children</h2>
    <p>The Service is for businesses and is not directed at anyone under 16.</p>

    <h2>Changes</h2>
    <p>We will update this page if our practices change, and email you about significant changes.</p>

    <h2>Contact</h2>
    <p>{{ site.operator }} · <a :href="`mailto:${site.supportEmail}`">{{ site.supportEmail }}</a></p>
  </LandingLegalPage>
</template>
