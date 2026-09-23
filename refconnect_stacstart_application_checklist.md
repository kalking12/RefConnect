# RefConnect — Stacstart Hackathon Application Checklist

## Recommended positioning

Submit RefConnect under **Access & Inclusion**. The track explicitly includes tools that widen access to healthcare across Nigeria, Kenya, Uganda, and Ghana. RefConnect’s core proposition is practical and specific: it helps clinicians compare procedure-level hospital readiness, identify a suitable referral destination, and prepare a referral handoff. That is a direct access-to-care story rather than a generic hospital-software pitch. [1]

> **One-sentence submission description:** RefConnect is a clinical-referral coordination platform that helps healthcare providers identify the best-equipped destination for a procedure and prepare a faster, more informed patient handoff.

## Required actions before submission

| Priority | Action | RefConnect status | Owner action |
|---|---|---|---|
| 1 | Register for the Stacstart Summit | Required for hackathon eligibility | Complete registration for every team member. |
| 2 | Form a team of 2–4 people | Required; solo entries are not permitted | Confirm names, roles, and contact details. |
| 3 | Join the Hackathon Hub and introduce the team | Required participation step | Share the team name, roles, and what you are building. |
| 4 | Publish a social post with `#BuildWithStacStart` | Required participation step | Post a concise announcement with the RefConnect problem statement. |
| 5 | Confirm the live prototype URL | **Ready:** `https://refconnect.manus.space` | Perform one final mobile and desktop demo rehearsal. |
| 6 | Create a public GitHub repository | Required submission item | Publish a clean repository with a concise README and no secrets. |
| 7 | Record a short video demonstration | Required submission item | Show the end-to-end referral workflow in 90–120 seconds. |
| 8 | Submit project details | Required submission item | Use the title, audience, and stack summary below. |

The event page lists a submission deadline of **28 September at 11:59 PM** and requires a deployed prototype, public repository, video pitch, and project details. [1]

## Submission-ready project details

| Field | Recommended wording |
|---|---|
| Project title | RefConnect — Clinical Readiness to Confirmed Referral |
| Track | Access & Inclusion |
| Target users | Doctors, referral coordinators, and administrators at primary, secondary, and tertiary healthcare facilities. |
| Problem | Referral decisions can be delayed when clinicians cannot quickly confirm which hospital has the staff, infrastructure, and clinical capacity needed for a procedure. |
| Solution | A shared referral workflow combining editable hospital capability data, procedure-weighted readiness scoring, ranked destination options, and structured referral handoff preparation. |
| Technology | React, TypeScript, Tailwind CSS, Express, tRPC, Drizzle ORM, and MySQL/TiDB. |
| Live prototype | `https://refconnect.manus.space` |

## Recommended 90–120 second demo flow

Begin with the problem in one sentence: a clinician needs to make a referral decision but must establish where a patient can be managed safely. Then show the Doctor Portal, search for a procedure, open the **Best Fit Hospital** workflow, and explain that each destination is ranked using its maintained capability information. Select a hospital and show the prepared referral handoff. Finish in the Administrator Portal by showing that hospital capability records can be updated securely, which changes the decision-support data over time.

This flow should make the judges see the full loop: **data maintenance → clinical readiness comparison → referral choice → structured handoff**. It directly supports the event’s strongest scoring area, technical execution, while keeping the problem and demo clear. [1]

## Pitch emphasis by judging criterion

| Criterion | Weight | RefConnect proof point |
|---|---:|---|
| Technical execution | 35% | Show the live, responsive product; procedure-specific readiness calculation; role-gated administrator updates; and the referral handoff flow. |
| Problem fit | 25% | Focus on referral delays, fragmented availability information, and the clinical consequences of an unsuitable destination. Do not invent unsourced impact statistics. |
| Demo / communication | 20% | Lead with a single clinical decision, not every feature. Keep the transition from procedure search to referral action visible. |
| Originality & innovation | 20% | Differentiate RefConnect as readiness-led referral coordination rather than a static hospital directory or generic appointment tool. |

## Final pre-submission checks

The team should test the exact demo scenario on a phone and laptop, verify that the live URL loads, and ensure no placeholder credentials or private patient data are exposed. The public repository should include installation steps, a clear feature summary, and a short statement that the showcase hospital capability values are illustrative where applicable. The pitch deck should use only verified product claims: the deployed prototype, the five active showcase institutions, the 50 procedure catalogue, and the role-gated administrator workflow.

## Reference

[1] [Stacstart, “Borderless Bytes Hackathon”](https://stacstart.com/hackathon#tracks)
