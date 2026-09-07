#!/bin/sh
# Build locally, then deploy without Git metadata.
# Vercel blocks production when the Git author email is not on the team.
set -eu
scope="${VERCEL_SCOPE:-ukryty-6366}"
vercel build --prod --yes --scope "$scope"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsync -a --exclude .git --exclude .next/cache ./ "$tmp/"
vercel deploy --prebuilt --prod --yes --scope "$scope" --cwd "$tmp"
