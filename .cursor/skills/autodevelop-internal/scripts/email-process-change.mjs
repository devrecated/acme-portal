#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 */
import {
  assertSafeProject,
  loadConfig,
} from "./config-load.mjs";
import { fail, parseArgs, printJson } from "./lib.mjs";
import { boardUrl, digestRecipients } from "./people.mjs";
import {
  assertMailConfirm,
  buildMailDoc,
  mailTransportOf,
  postHostedMail,
  readLoginToken,
  resolveMailHost,
} from "./send-stakeholder-mail.mjs";

const loadAdmin = async () => {
  const mod = await import("firebase-admin");
  return mod.default || mod;
};

if (process.argv[1]?.endsWith("email-process-change.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: true });
    const transport = mailTransportOf(config);
    const projectId = config.mail?.firestoreProject;
    if (transport === "firestore" || projectId) assertSafeProject(projectId, config);
    const to = digestRecipients(config);
    const board = boardUrl(config);
    const subject = "Update: how ticket emails and the GitHub board work";
    const html = [
      "<p>The employee ticket workflow changed. Please read the updated guide:</p>",
      `<p><a href="https://github.com/${config.github.owner}/${config.github.repo}/blob/${config.preview.baseBranch || "master"}/${config.docs?.stakeholderGuide || "docs/STAKEHOLDER_AUTOMATION.md"}">${config.docs?.stakeholderGuide || "docs/STAKEHOLDER_AUTOMATION.md"}</a></p>`,
      `<p>Board: <a href="${board}">${board}</a></p>`,
      "<p>Reply on the GitHub ticket when we ask a question. You do not move board columns.</p>",
    ].join("\n");
    if (args.dryRun) {
      printJson({ ok: true, dryRun: true, transport, projectId, to, subject });
      process.exit(0);
    }
    assertMailConfirm({ dryRun: false, ci: args.flags.has("ci"), token: args.values.confirm });
    if (transport === "hosted") {
      const result = await postHostedMail({
        origin: resolveMailHost(process.env),
        token: readLoginToken(process.env),
        to,
        subject,
        html,
        confirm: args.values.confirm,
      });
      printJson({
        ok: true,
        transport: result.transport || "hosted",
        id: result.id,
        toCount: result.toCount || to.length,
      });
      process.exit(0);
    }
    const admin = await loadAdmin();
    if (!admin.apps.length) {
      admin.initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` });
    }
    const ref = await admin.firestore().collection("mail").add(buildMailDoc({ to, subject, html }));
    printJson({ ok: true, id: ref.id, projectId, to });
  } catch (error) {
    fail(error.message);
  }
}
