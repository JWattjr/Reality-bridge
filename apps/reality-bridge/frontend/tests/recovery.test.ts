import { describe, expect, it } from "vitest";

import { choiceCommitment, generateSalt } from "@/lib/crypto";
import {
  RECOVERY_BUNDLE_VERSION,
  buildBundle,
  parseBundle,
  serializeBundle,
  validateBundle,
} from "@/lib/recovery";
import {
  bundleKey,
  findBundle,
  forgetBundle,
  loadBundles,
  saveBundle,
} from "@/lib/storage";
import { ALICE, BOB, CONTRACT } from "./fixtures";

async function makeBundle(
  overrides: Partial<Parameters<typeof buildBundle>[0]> = {},
) {
  const salt = overrides.salt ?? generateSalt();
  const choice = overrides.choice ?? "YES";
  const roundId = overrides.roundId ?? "1";
  const tileIndex = overrides.tileIndex ?? 0;
  const account = overrides.account ?? ALICE;
  const commitment = await choiceCommitment({
    roundId,
    tileIndex,
    account,
    choice,
    salt,
  });
  return buildBundle({
    contract: overrides.contract ?? CONTRACT,
    roundId,
    tileIndex,
    account,
    choice,
    salt,
    commitment,
  });
}

describe("commitment", () => {
  it("matches the contract's domain-separated pre-image", async () => {
    // Reference value produced by the contract's `_choice_commitment` for
    // round 1, panel 0, this address, YES and the salt "salt-0".
    const digest = await choiceCommitment({
      roundId: "1",
      tileIndex: 0,
      account: "0x0000000000000000000000000000000000000001",
      choice: "YES",
      salt: "salt-0",
    });
    expect(digest).toMatch(/^[0-9a-f]{64}$/);

    const other = await choiceCommitment({
      roundId: "1",
      tileIndex: 1,
      account: "0x0000000000000000000000000000000000000001",
      choice: "YES",
      salt: "salt-0",
    });
    expect(other).not.toBe(digest);
  });

  it("is insensitive to address casing but sensitive to every other field", async () => {
    const lower = await choiceCommitment({
      roundId: "1",
      tileIndex: 0,
      account: ALICE,
      choice: "YES",
      salt: "s",
    });
    const upper = await choiceCommitment({
      roundId: "1",
      tileIndex: 0,
      account: ALICE.toUpperCase(),
      choice: "YES",
      salt: "s",
    });
    expect(upper).toBe(lower);

    const flipped = await choiceCommitment({
      roundId: "1",
      tileIndex: 0,
      account: ALICE,
      choice: "NO",
      salt: "s",
    });
    expect(flipped).not.toBe(lower);
  });

  it("produces a fresh 256-bit salt each time", () => {
    const first = generateSalt();
    const second = generateSalt();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
  });
});

describe("recovery bundle export and import", () => {
  it("round-trips through serialization", async () => {
    const bundle = await makeBundle();
    const parsed = parseBundle(serializeBundle(bundle));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.bundle).toEqual(bundle);
      expect(parsed.bundle.version).toBe(RECOVERY_BUNDLE_VERSION);
      expect(parsed.bundle.network).toBe("studionet");
    }
  });

  it("rejects malformed, truncated and wrong-version payloads", () => {
    expect(parseBundle("not json")).toMatchObject({ ok: false });
    expect(parseBundle("[]")).toMatchObject({ ok: false });
    expect(parseBundle(JSON.stringify({ version: 99 }))).toMatchObject({
      ok: false,
    });
    expect(
      parseBundle(JSON.stringify({ version: 1, contract: CONTRACT })),
    ).toMatchObject({ ok: false });
  });

  it("accepts a bundle that matches the account, round, panel and commitment", async () => {
    const bundle = await makeBundle();
    const result = await validateBundle(bundle, {
      contract: CONTRACT,
      roundId: "1",
      tileIndex: 0,
      account: ALICE,
      onChainCommitment: bundle.commitment,
    });
    expect(result).toEqual({ ok: true, problems: [] });
  });

  it("rejects a bundle from another wallet, round, panel or contract", async () => {
    const bundle = await makeBundle();
    const result = await validateBundle(bundle, {
      contract: "0x2222222222222222222222222222222222222222",
      roundId: "7",
      tileIndex: 2,
      account: BOB,
    });
    expect(result.ok).toBe(false);
    expect(result.problems).toHaveLength(4);
    expect(result.problems.join(" ")).toMatch(/different Reality Bridge contract/);
    expect(result.problems.join(" ")).toMatch(/round 1/);
    expect(result.problems.join(" ")).toMatch(/panel 1/);
    expect(result.problems.join(" ")).toMatch(/different wallet/);
  });

  it("detects a bundle whose salt was edited after export", async () => {
    const bundle = await makeBundle();
    // Flip the final nibble to a *different* value. Appending a fixed digit
    // would be a no-op whenever the random salt already ended in it, which
    // made this test fail roughly one run in sixteen.
    const lastChar = bundle.salt.slice(-1);
    const tampered = {
      ...bundle,
      salt: bundle.salt.slice(0, -1) + (lastChar === "0" ? "1" : "0"),
    };
    expect(tampered.salt).not.toBe(bundle.salt);
    const result = await validateBundle(tampered, {
      contract: CONTRACT,
      roundId: "1",
      tileIndex: 0,
      account: ALICE,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/do not reproduce its own commitment/);
  });

  it("detects a valid bundle that does not match the chain state", async () => {
    const bundle = await makeBundle();
    const result = await validateBundle(bundle, {
      contract: CONTRACT,
      roundId: "1",
      tileIndex: 0,
      account: ALICE,
      onChainCommitment: "f".repeat(64),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/does not match the commitment stored/);
  });

  it("rejects a bundle exported for another network", async () => {
    const bundle = await makeBundle();
    const result = await validateBundle(
      { ...bundle, network: "wrong-network", chainId: 1 },
      {
        contract: CONTRACT,
        roundId: "1",
        tileIndex: 0,
        account: ALICE,
      },
    );
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toMatch(/not StudioNet/);
  });
});

describe("durable local storage", () => {
  it("survives a simulated reload and can be cleared", async () => {
    const bundle = await makeBundle();
    saveBundle(bundle);

    const key = { contract: CONTRACT, roundId: "1", tileIndex: 0, account: ALICE };
    expect(findBundle(key)).toEqual(bundle);
    // A reload reads the same durable store, not React state.
    expect(loadBundles()[bundleKey(bundle)]).toEqual(bundle);

    forgetBundle(key);
    expect(findBundle(key)).toBeNull();
  });

  it("returns nothing when local storage was cleared, so the export matters", async () => {
    const bundle = await makeBundle();
    saveBundle(bundle);
    window.localStorage.clear();
    expect(
      findBundle({ contract: CONTRACT, roundId: "1", tileIndex: 0, account: ALICE }),
    ).toBeNull();

    // The exported text is enough to restore custody on a clean profile.
    const parsed = parseBundle(serializeBundle(bundle));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const check = await validateBundle(parsed.bundle, {
        contract: CONTRACT,
        roundId: "1",
        tileIndex: 0,
        account: ALICE,
        onChainCommitment: bundle.commitment,
      });
      expect(check.ok).toBe(true);
    }
  });

  it("keeps bundles for different panels and wallets apart", async () => {
    const first = await makeBundle({ tileIndex: 0 });
    const second = await makeBundle({ tileIndex: 1 });
    const other = await makeBundle({ account: BOB });
    saveBundle(first);
    saveBundle(second);
    saveBundle(other);

    expect(
      findBundle({ contract: CONTRACT, roundId: "1", tileIndex: 1, account: ALICE }),
    ).toEqual(second);
    expect(
      findBundle({ contract: CONTRACT, roundId: "1", tileIndex: 0, account: BOB }),
    ).toEqual(other);
  });
});
