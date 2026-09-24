#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadConfig } from "./config-load.mjs";
import { boardUrl, digestRecipients } from "./people.mjs";

const escapeMd = (value) => String(value || "").replaceAll("|", "\\|");

const personRow = (person) =>
  `| ${escapeMd(person.name)} | ${person.github ? `@${person.github}` : "—"} | ${escapeMd(person.email)} |`;

export const buildStakeholderReadme = (config) => {
  const people = config.people || { developers: [], stakeholders: [] };
  const board = boardUrl(config);
  const digestTo = digestRecipients(config).join(", ");
  const statuses = Object.keys(config.fields?.status?.options || {});
  const product = config.productName || "this product";
  const label = config.stakeholderLabel || "Client";
  const notifyNote = digestTo
    ? `Release digest recipients always include: \`${digestTo}\`.`
    : "Release digest recipients are stakeholders plus anyone marked `alwaysNotify` in `people.json`.";
  return `# ${product} — ticket emails and the GitHub board

This page is for ${label} employees. Developers build the work in Cursor. You get email when something needs your reply, and a summary when work ships.

You do **not** move columns on the board. Reply on the GitHub ticket. A developer updates the status.

**Board:** ${board}

## What happens behind the scenes

1. Notes become tickets on GitHub Project **${config.github.projectNumber}**.
2. A developer claims a ticket (**In progress**) and builds it.
3. If something is unclear, you get a **more-info** email. Reply **on the ticket**.
4. When the work is ready, status becomes **Owner acceptance**. You get a review email with a staging preview link and (sometimes) a PDF, PPT, or screenshots. Those file links expire in **7 days**.
5. Reply on the ticket: **accept** or list changes. The developer then sets **Accepted by owner**.
6. Before production you may get a **staging → production** approval email. Reply approve or hold on the ticket.
7. After a production ship you get a **release digest** (Done tickets, docs links, refreshed file links). Anyone marked \`alwaysNotify\` in \`people.json\` is always on that email.

Staging preview URLs use staging data (\`${config.preview.firebaseProject}\`). Sign in with your usual account. Mail is sent through Firestore \`mail\` on **${config.mail.firestoreProject}** — not Gmail, not Mail.app.

## How to open docs and the board from the app

Use the links your team configured (version menu, docs site, or the board URL above).

## Statuses

${statuses.map((name) => `- ${name}`).join("\n")}

| When this happens | Email you get | How to respond |
|---|---|---|
| Developer is stuck or the request is unclear | More information | Reply **on the GitHub ticket** with answers. Do not reply only to the email. |
| Ticket moved to **Owner acceptance** | Please review on staging and accept | Click the staging link. Reply on the ticket: accept, or list what to change. |
| Ticket is **Accepted by owner** and ready for production | Approve staging → production | Reply on the ticket: approve or hold. |
| Tickets moved to **Done** and released | Release digest | Read-only. No reply needed unless something looks wrong. |
| Developer ships without owner accept | None until they record verbal acceptance | If you told them yes in person, they will write that on the ticket. |

## Developers (assignees)

These people commit to the repo and are assigned tickets.

| Name | GitHub | Email |
|---|---|---|
${(people.developers || []).map(personRow).join("\n")}

## Stakeholders (reviewers)

${label} employees. You are \`@\` mentioned on tickets and receive the emails above.

| Name | GitHub | Email |
|---|---|---|
${(people.stakeholders || []).map(personRow).join("\n")}

${notifyNote}

## File links

PDF, PPT, and screenshot links in email are private storage URLs. They expire after **7 days**. If a link is dead, ask the developer to send a new digest (they refresh the 7-day token).

---

*Generated from \`people.json\` and Project ${config.github.projectNumber} config. Do not edit by hand — run the stakeholder-readme script.*
`;
};

if (process.argv[1]?.endsWith("generate-stakeholder-readme.mjs")) {
  const { config, root } = loadConfig({ requireInstance: true });
  const out = join(root, config.docs?.stakeholderGuide || "docs/STAKEHOLDER_AUTOMATION.md");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildStakeholderReadme(config));
  process.stdout.write(`${out}\n`);
}
