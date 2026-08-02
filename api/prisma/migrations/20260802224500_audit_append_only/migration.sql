-- Make the audit trail append-only at the database level.
--
-- The application never updates or deletes audit rows, but "the code doesn't do
-- it" is not a control an auditor can rely on: a bug, a migration, or someone
-- with a psql prompt could still rewrite history. These triggers make the
-- database itself refuse, so a lock that was ordered can always be proven.

CREATE OR REPLACE FUNCTION golden_one_audit_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'AuditLog is append-only: % on audit records is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION golden_one_audit_immutable();

DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION golden_one_audit_immutable();
