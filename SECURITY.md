# Security policy

Please do not disclose vulnerabilities in public issues. Use GitHub's private
vulnerability reporting for this repository and include reproduction steps,
the affected endpoint, and the expected tenant boundary.

## Tenant isolation invariants

- Tenant identity comes only from verified OAuth grant properties.
- MCP tools never accept `businessId` or `tenantId`.
- The LocalTry bridge revalidates membership, role, scope, and ownership.
- Connector credentials and session tokens are never MCP resources or outputs.
- Every write is audited and consequential operations require approval.
- Workspace changes are versioned and can be restored only inside the same
  tenant.
