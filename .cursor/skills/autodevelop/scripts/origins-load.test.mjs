/**
 * Copyright (c) 2026 Devrecated
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCAL_DEFAULTS,
  ORIGIN_ENV_KEYS,
  isLoopbackOrigin,
  isRemoteRuntime,
  resolveOrigins,
} from "./origins-load.mjs";

const policy = {
  defaultProductionName: "production",
  environments: {
    local: { origins: { host: "", api: "", tickets: "" } },
    production: {
      host: "vercel",
      hostname: "",
      origins: {
        host: "https://host.example",
        api: "https://api.example",
        tickets: "https://tickets.example",
      },
    },
  },
};

test("isLoopbackOrigin accepts localhost and 127.0.0.1 only", () => {
  assert.equal(isLoopbackOrigin("http://localhost:5174"), true);
  assert.equal(isLoopbackOrigin("http://127.0.0.1:8789"), true);
  assert.equal(isLoopbackOrigin("https://api.example"), false);
  assert.equal(isLoopbackOrigin(""), false);
});

test("local runtime defaults to the sandbox when nothing is set", () => {
  const origins = resolveOrigins({ env: {}, policy, environment: "local" });
  assert.equal(origins.remote, false);
  assert.equal(origins.api, LOCAL_DEFAULTS.api);
  assert.equal(origins.tickets, LOCAL_DEFAULTS.tickets);
  assert.equal(origins.host, LOCAL_DEFAULTS.host);
});

test("env wins over policy", () => {
  const origins = resolveOrigins({
    env: { [ORIGIN_ENV_KEYS.api]: "https://from-env.example" },
    policy,
    environment: "production",
  });
  assert.equal(origins.api, "https://from-env.example");
  assert.equal(origins.tickets, "https://tickets.example");
});

test("remote runtime never returns a loopback default or env", () => {
  const origins = resolveOrigins({
    env: {
      VERCEL: "1",
      [ORIGIN_ENV_KEYS.api]: "http://127.0.0.1:8789",
      [ORIGIN_ENV_KEYS.tickets]: "http://localhost:5174",
    },
    policy: { environments: { production: { origins: { api: "", tickets: "" } } } },
    environment: "production",
  });
  assert.equal(origins.remote, true);
  assert.equal(origins.api, "");
  assert.equal(origins.tickets, "");
  assert.equal(origins.host, "");
});

test("production policy origins are used when env is empty", () => {
  const origins = resolveOrigins({
    env: { AUTODEVELOP_ENV: "production" },
    policy,
  });
  assert.equal(isRemoteRuntime({ AUTODEVELOP_ENV: "production" }), true);
  assert.equal(origins.api, "https://api.example");
  assert.equal(origins.tickets, "https://tickets.example");
  assert.equal(origins.host, "https://host.example");
});

test("consumer hostname is not an Autodevelop product origin", () => {
  const origins = resolveOrigins({
    env: { AUTODEVELOP_ENV: "production" },
    policy: {
      environments: {
        production: {
          hostname: "acme.example",
          origins: { host: "", api: "", tickets: "" },
        },
      },
    },
  });
  assert.equal(origins.host, "");
  assert.equal(origins.api, "");
});
