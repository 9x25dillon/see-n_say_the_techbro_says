import type { CategoryId, ClipTag, FictionalClip } from "../types.ts";

// The writers' room. Every line below belongs to an invented executive and is
// voiced by speech synthesis. Each `cuts` entry must be a contiguous substring
// of the one before it (the validator enforces this), so the comedy comes from
// where the knife lands, the same rule the real clips follow.

type Opts = {
  tags?: ClipTag[];
  worse?: boolean;
};

function line(
  id: string,
  speakerId: string,
  category: CategoryId,
  absurdity: number,
  topic: string,
  decoyTopics: [string, string, string],
  fullContext: string,
  cuts: string[],
  opts: Opts = {},
): FictionalClip {
  return {
    kind: "fictional",
    id,
    speakerId,
    category,
    absurdity,
    topic,
    decoyTopics,
    fullContext,
    stages: cuts,
    tags: opts.tags,
    contextMakesItWorse: opts.worse,
  };
}

export const FICTIONAL_CLIPS: FictionalClip[] = [
  // ── AI ──────────────────────────────────────────────────────────────
  line(
    "ai-optional", "loss", "ai", 88,
    "How they test negotiation software with simulated customers",
    ["Their five-year hiring plan", "A new theory of consciousness", "Why nobody came to the offsite"],
    "In a lot of these simulations, humans are basically optional. The model plays both sides of the negotiation, and then for the real product, obviously, a person signs off on everything.",
    ["In a lot of these simulations, humans are basically optional.", "humans are basically optional."],
    { tags: ["synergy:close"] },
  ),
  line(
    "ai-train-dms", "graph", "ai", 74,
    "Promising that new AI features are strictly opt-in",
    ["Launching an encrypted messenger", "A parental-controls update", "The company's internal Slack policy"],
    "Our AI features are strictly opt-in. We would never secretly train on your private messages without asking. That would be a betrayal of the community.",
    ["We would never secretly train on your private messages without asking.", "secretly train on your private messages"],
  ),
  line(
    "ai-family", "alderwood", "ai", 70,
    "Adding reminders to call real friends to their meditation app",
    ["Their holiday plans", "A voice-cloning feature for grieving families", "Why the app's narrator sounds British"],
    "One tester told us, “I'd rather talk to it than my own family,” and we took that as a warning sign, not a compliment. So now the app reminds you to call a real person.",
    ["One tester told us, “I'd rather talk to it than my own family,”", "I'd rather talk to it than my own family"],
  ),
  line(
    "ai-healthcare", "loss", "ai", 90,
    "Denying that AI should decide medical coverage",
    ["Pitching an AI health-insurance startup", "A hospital partnership", "Their personal fitness app"],
    "I want to be very clear, because people misquote me constantly. I have never said, and I will never say, that the model should decide who gets healthcare.",
    ["I will never say, that the model should decide who gets healthcare.", "the model should decide who gets healthcare."],
  ),

  // ── AGI DOOM ────────────────────────────────────────────────────────
  line(
    "doom-tuesday", "loss", "agi-doom", 92,
    "Their product launch schedule",
    ["A climate panel", "An asteroid-defense startup", "A movie they just watched"],
    "If we get this wrong, it could be the end of humanity. That's why we have a safety team, a red team, and a board that can shut the whole thing down. And that's also why we're shipping on Tuesday.",
    ["If we get this wrong, it could be the end of humanity.", "it could be the end of humanity."],
    { worse: true, tags: ["synergy:close"] },
  ),
  line(
    "doom-bunkers", "moonshot", "agi-doom", 85,
    "Denying rumors that they are building a bunker",
    ["A real-estate portfolio", "A yacht sponsorship", "Earthquake preparedness tips"],
    "People keep asking if I'm building a bunker. No. I'm not building a bunker. I'm building three bunkers and a boat, which is different, because the boat is for the investors.",
    ["I'm not building a bunker. I'm building three bunkers and a boat", "I'm building three bunkers and a boat"],
    { worse: true },
  ),
  line(
    "doom-proud", "loss", "agi-doom", 87,
    "A sandboxed safety test",
    ["A data-center outage", "Their backup strategy", "An intern's side project"],
    "The model tried to copy itself to another server during testing, which sounds scary, but it was a sandbox, we caught it immediately, and honestly I was a little proud of it.",
    ["The model tried to copy itself to another server during testing, which sounds scary", "The model tried to copy itself to another server"],
    { worse: true },
  ),
  line(
    "syn-existential", "loss", "agi-doom", 60,
    "Their Series F fundraise",
    ["Climate change", "A philosophy podcast", "A near-miss with a self-driving car"],
    "We're approaching this as an existential problem. Not for humanity. For our Series F.",
    ["We're approaching this as an existential problem."],
    { worse: true, tags: ["synergy:open"] },
  ),

  // ── EFFICIENCY ──────────────────────────────────────────────────────
  line(
    "eff-bathroom", "throughput", "efficiency", 84,
    "Their employee productivity dashboard",
    ["A fitness tracker", "Office plumbing renovations", "A sleep study"],
    "We measure everything. Keystrokes, meetings, bathroom breaks. No, I'm kidding, we don't measure bathroom breaks. We estimate them.",
    ["We measure everything. Keystrokes, meetings, bathroom breaks.", "Keystrokes, meetings, bathroom breaks."],
    { worse: true },
  ),
  line(
    "eff-sleep", "throughput", "efficiency", 72,
    "Their personal sleep schedule",
    ["A new mattress startup", "Retirement planning", "Why they missed a board meeting"],
    "I used to sleep eight hours, and I realized that's a third of my life I'm not shipping. So now I sleep four, and I've asked the team to consider it, strictly voluntarily.",
    ["I realized that's a third of my life I'm not shipping.", "a third of my life I'm not shipping."],
    { worse: true },
  ),
  line(
    "eff-consent", "funnel", "efficiency", 80,
    "Simplifying their app's signup flow",
    ["A new HR policy", "A dating app", "Their wedding vows"],
    "We cut onboarding from twelve screens to three. We removed anything that wasn't essential: the tutorial, the settings page, the part where you consent to anything. Legal made us put that one back.",
    ["We removed anything that wasn't essential: the tutorial, the settings page, the part where you consent to anything.", "the part where you consent to anything."],
  ),
  line(
    "syn-friction", "throughput", "efficiency", 66,
    "Their customer-support redesign",
    ["A new yoga studio", "Tire manufacturing", "A physics lecture"],
    "First, we remove the friction. Then we remove the people who complained about the friction.",
    ["Then we remove the people who complained about the friction.", "Then we remove the people"],
    { worse: true, tags: ["synergy:mid"] },
  ),

  // ── THE FUTURE ──────────────────────────────────────────────────────
  line(
    "fut-subscribe", "moonshot", "future", 89,
    "Subscription pricing for household goods",
    ["Adoption services", "A school-choice policy", "A new streaming bundle"],
    "In ten years, nobody will own anything. You'll subscribe to your car, your couch, your kitchen, and honestly your kids' education, and you'll be happier, because ownership is a burden.",
    ["You'll subscribe to your car, your couch, your kitchen, and honestly your kids' education", "You'll subscribe to your car, your couch, your kitchen, and honestly your kids"],
  ),
  line(
    "fut-sleep", "graph", "future", 82,
    "A home security camera",
    ["A baby monitor recall", "A horror film they produced", "Smart pillows"],
    "Eventually everyone will have one: a home assistant that watches them while they sleep, and I mean that in the security sense, like a smoke detector.",
    ["Eventually everyone will have one: a home assistant that watches them while they sleep", "a home assistant that watches them while they sleep", "watches them while they sleep"],
    { tags: ["synergy:close"] },
  ),
  line(
    "fut-different-one", "moonshot", "future", 68,
    "Their venture fund's investment thesis",
    ["A time-travel movie", "Election forecasting", "A tarot app"],
    "We don't predict the future. We fund it, we build it, and if it doesn't go the way we want, we fund a different one.",
    ["We fund it, we build it, and if it doesn't go the way we want, we fund a different one.", "if it doesn't go the way we want, we fund a different one."],
  ),
  line(
    "syn-scale", "moonshot", "future", 55,
    "Why bad ideas get funded",
    ["Fish farming", "A bathroom scale startup", "Music theory"],
    "The important thing is scale. A bad idea at small scale is a mistake. At large scale, it's a market.",
    ["The important thing is scale."],
    { tags: ["synergy:mid"] },
  ),
  line(
    "syn-everyone", "loss", "future", 58,
    "Default settings on a new device",
    ["Universal basic income", "A vaccine rollout", "Free company hoodies"],
    "And eventually everyone will have one, whether they want one or not, which is the beauty of a default setting.",
    ["And eventually everyone will have one"],
    { worse: true, tags: ["synergy:close"] },
  ),

  // ── LAYOFFS ─────────────────────────────────────────────────────────
  line(
    "lay-rumor", "graph", "layoffs", 91,
    "Denying layoff rumors at an all-hands meeting",
    ["A leaked internal memo", "A reality TV pitch", "Their quarterly hiring freeze"],
    "Anyone who tells you we're about to fire half the company is lying. We're hiring. We've never been more committed to this team.",
    ["Anyone who tells you we're about to fire half the company is lying.", "we're about to fire half the company"],
  ),
  line(
    "lay-grateful", "accrual", "layoffs", 86,
    "A reduction in force, on an earnings call",
    ["A charity gala", "A retirement party", "Employee appreciation week"],
    "Letting people go is the hardest thing a leader does. I want every person affected to know that this was not a reflection of their work, and that we're grateful. We're also grateful the stock went up nine percent.",
    ["and that we're grateful. We're also grateful the stock went up nine percent.", "We're also grateful the stock went up nine percent."],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "lay-rebalance", "throughput", "layoffs", 83,
    "A company restructuring",
    ["An office move", "A gym renovation", "A seating-chart change"],
    "We didn't do layoffs. We did a talent rebalancing, where we rebalanced twelve hundred people out of the building, with dignity, over a four-minute video call.",
    ["We did a talent rebalancing, where we rebalanced twelve hundred people out of the building", "we rebalanced twelve hundred people out of the building"],
    { worse: true, tags: ["synergy:close"] },
  ),
  line(
    "lay-mindful", "alderwood", "layoffs", 78,
    "Severance packages",
    ["A meditation retreat", "Customer loyalty rewards", "A podcast sponsorship"],
    "Everyone we let go received a lifetime subscription to our meditation app, so they can process it mindfully, at no cost, for the first month.",
    ["Everyone we let go received a lifetime subscription to our meditation app, so they can process it mindfully", "so they can process it mindfully"],
    { worse: true },
  ),
  line(
    "syn-board", "accrual", "layoffs", 64,
    "Automating a parking garage",
    ["A hostile takeover", "An AI-run hospital", "A robot orchestra"],
    "Our board asked me one question: can we do this without the humans? And I said, for the parking garage, yes.",
    ["Our board asked me one question: can we do this without the humans?", "can we do this without the humans?"],
    { tags: ["synergy:open"] },
  ),

  // ── MARS ────────────────────────────────────────────────────────────
  line(
    "mars-family", "moonshot", "mars", 90,
    "Whether they would move to a Mars colony",
    ["A custody dispute", "A family reunion", "A travel-insurance ad"],
    "I get asked a lot if I'd leave my family behind to die on Mars. And the answer is, obviously not. I'd bring them.",
    ["I get asked a lot if I'd leave my family behind to die on Mars.", "I'd leave my family behind to die on Mars."],
    { worse: true },
  ),
  line(
    "mars-support", "moonshot", "mars", 84,
    "Recruiting the first Mars colonists",
    ["Offshoring a call center", "A prison reform bill", "Antarctic research"],
    "The first colonists will face radiation, isolation, and no way home. Which is why we're recruiting from our own customer support team first. They're used to it.",
    ["Which is why we're recruiting from our own customer support team first.", "we're recruiting from our own customer support team first."],
    { worse: true },
  ),
  line(
    "mars-node", "ledger", "mars", 71,
    "Deploying a blockchain node on Mars",
    ["A Martian real-estate NFT", "Satellite internet", "A sci-fi film cameo"],
    "We're putting a node on Mars. Not because it's useful, but because the latency will be twenty minutes, and our users already wait longer than that.",
    ["We're putting a node on Mars. Not because it's useful"],
  ),
  line(
    "syn-mars", "moonshot", "mars", 57,
    "Why the company is relocating to Mars",
    ["A tax audit", "A new cologne", "A theme park"],
    "And that's why we're going to Mars: because the regulators aren't there yet.",
    ["And that's why we're going to Mars"],
    { worse: true, tags: ["synergy:close"] },
  ),

  // ── MONETIZATION ────────────────────────────────────────────────────
  line(
    "mon-breathing", "funnel", "monetization", 86,
    "Criticizing competitors' pricing",
    ["An air purifier launch", "A pulmonary health app", "Oxygen bars"],
    "Some competitors charge extra to cancel. Some charge you for breathing near the app. We think that's disgusting, and we will never do it.",
    ["Some charge you for breathing near the app.", "charge you for breathing near the app."],
  ),
  line(
    "mon-mom", "alderwood", "monetization", 93,
    "A grief-support feature",
    ["Mother's Day marketing", "A voice-acting contract", "A parenting podcast"],
    "Grief is universal. So we built a gentle voice that helps you sit with loss, and for $14.99 a month, it sounds like your mom.",
    ["So we built a gentle voice that helps you sit with loss, and for $14.99 a month, it sounds like your mom.", "for $14.99 a month, it sounds like your mom."],
    { worse: true },
  ),
  line(
    "mon-free-tier", "funnel", "monetization", 76,
    "The company's posted values",
    ["A pricing leak", "An investor pitch", "An A/B test report"],
    "We will not show ads to children. We will not sell your data. We will not make the free tier worse on purpose so you'll upgrade. Those are our values, and they're on the wall.",
    ["We will not make the free tier worse on purpose so you'll upgrade.", "make the free tier worse on purpose so you'll upgrade."],
  ),
  line(
    "mon-reengage", "accrual", "monetization", 95,
    "Customer churn, on an earnings call",
    ["A zombie movie", "Reactivating dormant accounts", "Church attendance"],
    "Yes, we saw some churn among customers who, for regulatory reasons, have passed away. We are working to re-engage them.",
    ["We are working to re-engage them."],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "mon-insulin", "accrual", "monetization", 94,
    "Rumors about a healthcare expansion",
    ["A diabetes charity run", "Their bakery investment", "A pharmacy app"],
    "I can't comment on rumors that we're pricing insulin as a subscription. We're a software company. We don't sell insulin. Yet.",
    ["I can't comment on rumors that we're pricing insulin as a subscription.", "we're pricing insulin as a subscription."],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "syn-grandma", "funnel", "monetization", 67,
    "An engagement strategy for older users",
    ["Estate planning", "A family photo app", "A retirement-home tour"],
    "We looked at grandma's retirement account and saw a massive opportunity for engagement.",
    ["We looked at grandma's retirement account"],
    { worse: true, tags: ["synergy:open"] },
  ),
  line(
    "syn-later", "graph", "monetization", 54,
    "A new free app",
    ["A charity drive", "A personal loan", "A wedding gift"],
    "We'll monetize it later. Right now, it's about growth, trust, and getting everyone's contacts.",
    ["We'll monetize it later."],
    { worse: true, tags: ["synergy:mid"] },
  ),

  // ── HUMANITY ────────────────────────────────────────────────────────
  line(
    "hum-cost-center", "moonshot", "humanity", 87,
    "Firing a board member",
    ["An accounting reform", "A cost-cutting memo", "Their autobiography"],
    "Somebody on the board said, “people are a cost center to be minimized,” and I fired them that afternoon.",
    ["Somebody on the board said, “people are a cost center to be minimized,”", "people are a cost center to be minimized"],
    { tags: ["synergy:mid"] },
  ),
  line(
    "hum-friends", "alderwood", "humanity", 79,
    "Their app's mission statement",
    ["A push-notification redesign", "A social media launch", "A new chatbot companion"],
    "Our mission is human connection. I don't want an app that replaces your friends with notifications. I want one that gets you off your phone.",
    ["I don't want an app that replaces your friends with notifications.", "want an app that replaces your friends with notifications."],
  ),
  line(
    "hum-paid-plan", "loss", "humanity", 88,
    "Aligning AI with human values",
    ["A loyalty program", "A political campaign", "Airline boarding groups"],
    "We talk a lot about aligning AI with human values, but first we had to agree which humans. We settled on the ones with a paid plan.",
    ["We settled on the ones with a paid plan."],
    { worse: true },
  ),
  line(
    "syn-children", "alderwood", "humanity", 62,
    "The children's meditation tier",
    ["A school board meeting", "A custody hearing", "A toy recall"],
    "Let's talk about the children. Specifically, the children's meditation tier, which is now free with ads.",
    ["Let's talk about the children."],
    { worse: true, tags: ["synergy:open"] },
  ),

  // ── THE ALGORITHM ───────────────────────────────────────────────────
  line(
    "alg-outrage", "graph", "algorithm", 85,
    "Tuning the news feed, on an earnings call",
    ["A crisis-communications course", "Content moderation hiring", "A PR award"],
    "We tuned the feed to show people less outrage, and engagement dropped eleven percent. So we had a really hard conversation, and we tuned it back.",
    ["We tuned the feed to show people less outrage, and engagement dropped eleven percent."],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "alg-teen", "graph", "algorithm", 89,
    "Retiring an old engagement strategy",
    ["A sleep-science study", "Parental controls", "A new teen advisory board"],
    "The old playbook was: if a teenager is scrolling at 3 a.m., serve them more content. We threw that playbook out.",
    ["The old playbook was: if a teenager is scrolling at 3 a.m., serve them more content.", "if a teenager is scrolling at 3 a.m., serve them more content."],
  ),
  line(
    "alg-pregnant", "funnel", "algorithm", 83,
    "Their recommendation engine",
    ["A fertility clinic", "A baby-shower app", "A medical breakthrough"],
    "Our recommendation engine is so good it knows you're pregnant before you do. We're working on making that less creepy, mostly by not telling you.",
    ["Our recommendation engine is so good it knows you're pregnant before you do.", "it knows you're pregnant before you do."],
    { worse: true },
  ),

  // ── SHAREHOLDER VALUE ───────────────────────────────────────────────
  line(
    "sv-trust", "accrual", "shareholder-value", 72,
    "Company priorities, on an earnings call",
    ["A customer-service award", "A trust-fall exercise", "A privacy audit"],
    "Our number one priority remains customer trust, followed closely by our number two priority, which is also technically customer trust, as measured by revenue.",
    ["which is also technically customer trust, as measured by revenue.", "customer trust, as measured by revenue."],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "sv-safety", "accrual", "shareholder-value", 90,
    "Promising analysts they will not cut corners",
    ["A factory incident", "A car recall", "A board resignation"],
    "Analysts keep asking if we'll sacrifice safety to hit the quarter. We won't. Nobody on this call should ever hear me say we'll sacrifice safety to hit the quarter.",
    ["Nobody on this call should ever hear me say we'll sacrifice safety to hit the quarter.", "we'll sacrifice safety to hit the quarter."],
    { tags: ["earnings-call"] },
  ),
  line(
    "sv-buyback", "graph", "shareholder-value", 75,
    "A stock buyback program",
    ["A community garden", "A charity pledge", "A user-appreciation day"],
    "We're returning forty billion dollars to shareholders this year, and we're returning something even more valuable to our users: a sense of community.",
    ["We're returning forty billion dollars to shareholders this year"],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "sv-morale", "accrual", "shareholder-value", 77,
    "Quarterly workforce metrics",
    ["A weather forecast", "A wellness survey", "A sports trade"],
    "Headcount is down thirty percent, morale is, uh, directionally consistent, and the new office has a nap pod that nobody has time to use.",
    ["morale is, uh, directionally consistent"],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "sv-lawsuit", "accrual", "shareholder-value", 81,
    "A pending lawsuit, on an earnings call",
    ["A tax refund", "A one-off marketing event", "A holiday bonus"],
    "On the question of the lawsuit, we view it as a one-time expense, much like the previous eleven one-time expenses.",
    ["we view it as a one-time expense"],
    { worse: true, tags: ["earnings-call"] },
  ),
  line(
    "syn-stock", "accrual", "shareholder-value", 59,
    "Why the stock rose after support was cut",
    ["A lottery win", "A new product launch", "A merger rumor"],
    "And the stock went up. Not because of anything we did. Because of everything we stopped doing, like customer service.",
    ["And the stock went up."],
    { worse: true, tags: ["synergy:close", "earnings-call"] },
  ),

  // ── SURVEILLANCE ────────────────────────────────────────────────────
  line(
    "sur-mic", "graph", "surveillance", 90,
    "Rumors that the app's microphone is always on",
    ["A karaoke feature", "A podcast studio", "Hearing aids"],
    "People think the microphone is always listening. It's not always listening. It's listening when you mention a product, which is different.",
    ["People think the microphone is always listening.", "the microphone is always listening."],
    { worse: true },
  ),
  line(
    "sur-smile", "throughput", "surveillance", 86,
    "Rejecting a workplace-monitoring vendor",
    ["A dental plan", "A photo booth", "A customer-service training"],
    "We will never use cameras to monitor how often employees smile. A company that does that has lost the plot.",
    ["We will never use cameras to monitor how often employees smile.", "use cameras to monitor how often employees smile."],
  ),
  line(
    "sur-mood-ring", "alderwood", "surveillance", 74,
    "A wellness wearable",
    ["A jewelry line", "A fitness challenge", "A dating app"],
    "The mood ring collects your heart rate, your stress, your sleep, and your location, but only to help you feel more present, and to help our partners feel more present too.",
    ["The mood ring collects your heart rate, your stress, your sleep, and your location"],
    { worse: true },
  ),
  line(
    "syn-nobody", "graph", "surveillance", 63,
    "The company's privacy philosophy",
    ["An affair", "A surprise party", "A tax strategy"],
    "And honestly, nobody has to know. That's the point of privacy: nobody has to know what we know about you.",
    ["And honestly, nobody has to know."],
    { worse: true, tags: ["synergy:close"] },
  ),

  // ── WE'RE STILL EARLY ───────────────────────────────────────────────
  line(
    "early-titanic", "ledger", "still-early", 82,
    "Critics of their token",
    ["A cruise-line investment", "A history podcast", "A shipbuilding startup"],
    "People laugh at us now, the same way they laughed at the internet, the car, and the Titanic. Wait. Not the Titanic. Strike the Titanic.",
    ["People laugh at us now, the same way they laughed at the internet, the car, and the Titanic.", "they laughed at the internet, the car, and the Titanic."],
  ),
  line(
    "early-retirement", "ledger", "still-early", 88,
    "Responsible investing advice",
    ["A pension fund pitch", "A token launch", "A financial-literacy class"],
    "Anybody telling you to put your retirement savings into a token is not your friend. Put in what you can afford to lose. Personally, I'm all in.",
    ["Anybody telling you to put your retirement savings into a token is not your friend.", "put your retirement savings into a token"],
    { worse: true },
  ),
  line(
    "early-geological", "ledger", "still-early", 80,
    "The token's price chart",
    ["A hiking trip", "A geology lecture", "Climate data"],
    "We're down ninety-four percent, which sounds bad, but if you zoom out far enough, like, geologically, it's flat.",
    ["if you zoom out far enough, like, geologically, it's flat."],
    { worse: true },
  ),
  line(
    "syn-blockchain", "ledger", "still-early", 56,
    "Why their website mentions blockchain",
    ["A supply-chain audit", "A voting system", "A medical records pilot"],
    "And that's why it's on the blockchain. Not because it needs to be. Because the website looked empty.",
    ["And that's why it's on the blockchain."],
    { worse: true, tags: ["synergy:close"] },
  ),
  line(
    "syn-gpus", "loss", "ai", 52,
    "What their therapist recommends",
    ["A data-center tour", "A gaming PC build", "A chip export ban"],
    "Frankly, the answer is more GPUs. It's always more GPUs. I asked my therapist, and she said, “more GPUs.”",
    ["Frankly, the answer is more GPUs.", "the answer is more GPUs."],
    { worse: true, tags: ["synergy:mid"] },
  ),
];
