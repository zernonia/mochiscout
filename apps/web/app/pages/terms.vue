<template>
  <LandingLegalPage title="Terms of Service" description="The terms for using the hosted Mochiscout service.">
    <p>
      These terms are an agreement between you and {{ site.operator }} ("we", "us") for your use of Mochiscout at
      <a :href="site.url">{{ site.url.replace('https://', '') }}</a> (the "Service"). By creating an account you agree to them. If you use the
      Service for a company, you agree on its behalf.
    </p>

    <h2>The Service</h2>
    <p>
      Mochiscout helps you find public posts on Reddit, Hacker News, Bluesky and X from people who may need your product, checks drafts against
      community rules, and tracks posts you publish. The Service never posts, comments, votes or sends messages on your behalf. You decide what to
      post and you post it yourself.
    </p>
    <p>
      The Mochiscout source code is open source under the AGPL-3.0 licence. These terms cover the hosted Service only; your use of the code is
      governed by that licence.
    </p>

    <h2>Your account</h2>
    <ul>
      <li>You must be at least 16 and give accurate sign-up information.</li>
      <li>Keep your password and API keys secret. You are responsible for activity under your account and your team.</li>
      <li>Tell us promptly at <a :href="`mailto:${site.supportEmail}`">{{ site.supportEmail }}</a> if you suspect unauthorised access.</li>
    </ul>

    <h2>Acceptable use</h2>
    <p>You agree not to use the Service to:</p>
    <ul>
      <li>Send spam, unsolicited bulk messages or deceptive promotion, or break the rules of any community or platform you post in.</li>
      <li>Harass, track or build profiles of individuals, or collect personal data about the people whose posts you see.</li>
      <li>Automate posting, voting or messaging using content or data from the Service, or operate fake or undisclosed sock-puppet accounts.</li>
      <li>Resell, scrape or bulk-export the Service's data, or use it to build a competing dataset.</li>
      <li>Probe, overload or disrupt the Service, or get around plan limits or access controls.</li>
      <li>Break any law, or infringe anyone's rights.</li>
    </ul>
    <p>
      You are responsible for what you post on third-party platforms, and for following their terms. Rule checks and pacing limits are guidance
      to reduce risk; they cannot guarantee that a post will not be removed or that an account will not be restricted.
    </p>

    <h2>Your content</h2>
    <p>
      You keep ownership of everything you put into the Service, such as your product profile and drafts. You give us permission to store and
      process it only to provide the Service to you. AI-generated suggestions are yours to use, edit or discard; review them before posting.
    </p>

    <h2>Third-party content</h2>
    <p>
      Posts shown in your feed belong to their authors and are provided by third-party platforms. We show links and short excerpts so you can find
      and respond to them; we do not claim ownership of that content and do not guarantee that it is accurate or still available.
    </p>

    <h2>Plans, billing and cancellation</h2>
    <ul>
      <li>The Free plan costs nothing. Paid plans (Solo and Pro) are billed monthly in advance at the price shown on our pricing page.</li>
      <li>Payments are processed by Polar, which acts as merchant of record and may add applicable taxes.</li>
      <li>You can upgrade, downgrade or cancel at any time from the billing page. When you cancel, your plan stays active until the end of the period you paid for, then your account moves to the Free plan.</li>
      <li>If the Service did not work for you, email us within 14 days of a charge and we will refund it.</li>
      <li>We may change prices with at least 30 days' notice by email. Changes apply from your next billing period.</li>
    </ul>

    <h2>Availability and changes</h2>
    <p>
      We work to keep the Service running, but it depends on third-party platforms and APIs that can change or limit access at any time, so we do
      not guarantee that any particular source or feature will always be available. We may change or discontinue features; if we shut down a paid
      Service, we will refund unused prepaid time.
    </p>

    <h2>Suspension and termination</h2>
    <p>
      You can stop using the Service and ask us to delete your account at any time. We may suspend or close accounts that break these terms or put
      the Service or others at risk, and we will tell you why unless the law or safety prevents it.
    </p>

    <h2>Disclaimers</h2>
    <p>
      The Service is provided "as is" and "as available". To the extent the law allows, we disclaim all implied warranties, including
      merchantability, fitness for a particular purpose and non-infringement. We do not promise any number of leads, sales or results.
    </p>

    <h2>Limitation of liability</h2>
    <p>
      To the extent the law allows, we are not liable for indirect, incidental, special or consequential damages, lost profits or lost data, or for
      actions taken by third-party platforms (such as removed posts or restricted accounts). Our total liability for any claim is limited to the
      amount you paid us in the 12 months before the claim, or US$50 if greater. Nothing in these terms limits liability that cannot be limited by law.
    </p>

    <h2>Changes to these terms</h2>
    <p>
      We may update these terms. For significant changes we will email you at least 14 days before they take effect. Continuing to use the
      Service after that means you accept the new terms.
    </p>

    <h2>Contact</h2>
    <p>{{ site.operator }} · <a :href="`mailto:${site.supportEmail}`">{{ site.supportEmail }}</a></p>
  </LandingLegalPage>
</template>
