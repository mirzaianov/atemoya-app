# ADR-009: Use application encryption for sensitive database values

## Status

Accepted

## Date

2026-07-30

## Implementation Readiness

The high-level decision to protect sensitive database values with application
encryption remains accepted. The current implementation plan is blocked after
the 2026-07-30 architecture review found unresolved security, transaction,
adapter, migration, normalization, logging, and test-design problems.

Do not implement or schedule production conversion until the linked
architecture plan is revised and approved again. The threat-model boundary was
resolved on 2026-07-31: this decision protects against passive database
exfiltration and read-only database exposure. Active database writes,
relationship manipulation, deletion, rollback, and use of the application as
a decryption or authentication oracle are explicitly out of scope.

## Context

Neon encrypts physical storage, but a logical database dump, copied snapshot,
or read-only database exposure can still reveal Better Auth records and
user-authored task titles. The selected threat model is passive database
exfiltration where the attacker cannot modify the database and does not also
obtain application runtime secrets. The objective is confidentiality for
sensitive content and credentials, not literal encryption of every user-linked
identifier or operational value.

## Decision

Use versioned application-level encryption for sensitive values:

- AES-256-GCM from `node:crypto`, with a fresh IV and authenticated context
  binding each value to its model, field, and record
- an independent HMAC-SHA-256 key with domain-separated inputs for normalized
  equality-search blind indexes
- keys stored outside Neon in the existing local and production secret systems
- separate encryption and lookup keys for production and development/Preview
- database-boundary encryption for tasks and a custom Better Auth adapter for
  identity, session, and verification data
- Better Auth ownership of its native TOTP and backup-code encryption
- Better Auth `scrypt` hashes retained for passwords
- blind indexes that preserve unique email, nickname, and per-user normalized
  task-title behavior
- readable verification purpose and subject-user metadata so password resets
  can revoke trusted devices without scanning ciphertext
- an immediate, fully verified production conversion while a maintenance gate
  blocks application access

The detailed field classification and rollout are in
`docs/architecture/database-theft-encryption-plan.md`.

## Alternatives Considered

### Managed KMS with envelope encryption

- Pros: Stronger key controls and auditing.
- Cons: Adds infrastructure, permissions, network calls, and operational cost.
- Rejected for the first release: Reconsider when compliance or application
  secret compromise enters the threat model.

### PostgreSQL `pgcrypto`

- Pros: Encryption is close to stored data.
- Cons: Decryption keys reach the database execution layer.
- Rejected: It weakens separation between keys and data.

### Storage encryption only

- Pros: No application complexity.
- Cons: Does not protect logical dumps, copied snapshots, or read-only database
  exposure.
- Rejected: It does not cover the selected threat model.

### Encrypt every user-linked database value

- Pros: Reveals less metadata.
- Cons: Breaks useful foreign keys, ordering, expiry, and indexed operational
  queries without changing the trusted-server threat boundary.
- Rejected: Sensitive-content confidentiality meets the selected threat model;
  opaque identifiers and required operational metadata remain readable.

### Zero-downtime dual-write conversion

- Pros: Old and new application versions can overlap during migration.
- Cons: Retains readable copies, adds mixed-row behavior, and increases rollback
  and uniqueness complexity.
- Rejected: A short maintenance window permits a smaller immediate conversion
  with no production dual-write phase.

### Application encryption for Better Auth native secrets

- Pros: One encryption key family owns every reversible secret.
- Cons: Double-encrypts fields Better Auth already manages and increases plugin
  compatibility risk.
- Rejected: Better Auth continues to encrypt TOTP secrets and backup codes with
  its independent secret.

## Consequences

- Passive database exfiltration does not reveal protected plaintext.
- A custom Better Auth adapter becomes security-critical.
- Relational metadata remains visible. Active database writes, application
  compromise, and application-oracle attacks remain out of scope.
- KeePass is the sole recovery source for application encryption keys; losing
  that vault causes permanent data loss.
- Production conversion relies on Neon's recorded 6-hour restore point rather
  than a second full-data branch.
- Production support through Neon SQL sees ciphertext; no privileged
  decryption utility is included in the first release.
- The encryption direction is accepted, but implementation and production
  conversion remain blocked until the architecture-review findings are
  resolved and the revised plan is approved.
