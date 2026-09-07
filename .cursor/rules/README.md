# Kit rules

Same layout as skills and hooks. Cursor loads `.mdc` files under `.cursor/rules/` (frontmatter still controls `alwaysApply` / `globs`).

Do **not** reuse a rule filename in more than one tree.

Instance-specific globs (docs tree, Firebase project folders) belong in the consumer or in `repo-conventions.json` / instance `config.json`, not hardcoded in `autodevelop/` or `third-party/`. Authored rules live under `autodevelop/<category>/` — do not add a fourth top-level category folder.
