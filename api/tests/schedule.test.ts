// Loan arithmetic. Pure functions, so these are unit tests — the behaviour here
// decides who appears in the collections queue, so it is worth pinning exactly.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMonths, applyPayment, arrearsDue, daysBetween, recompute } from "../src/services/schedule.js";

const iso = (s: string) => new Date(`${s}T00:00:00.000Z`);

const base = {
  amount: 9_800_000,
  monthly: 980_000,
  paid: 2_940_000,
  nextPaymentDate: iso("2026-07-10"),
  status: "ACTIVE" as const,
};

describe("date helpers", () => {
  it("counts whole elapsed days", () => {
    assert.equal(daysBetween(iso("2026-07-10"), iso("2026-07-22")), 12);
    assert.equal(daysBetween(iso("2026-07-10"), iso("2026-07-10")), 0);
  });

  it("does not skip a month when the due day does not exist", () => {
    // Adding a month to 31 January must land in February, not March.
    assert.equal(addMonths(iso("2026-01-31"), 1).toISOString().slice(0, 10), "2026-02-28");
  });
});

describe("recompute", () => {
  it("marks a contract overdue once the due date has passed", () => {
    const r = recompute(base, iso("2026-07-22"));
    assert.equal(r.status, "OVERDUE");
    assert.equal(r.daysOverdue, 12);
  });

  it("leaves a contract active before its due date", () => {
    const r = recompute(base, iso("2026-07-01"));
    assert.equal(r.status, "ACTIVE");
    assert.equal(r.daysOverdue, 0);
  });

  it("treats a fully paid contract as settled with nothing due", () => {
    const r = recompute({ ...base, paid: base.amount }, iso("2026-12-01"));
    assert.equal(r.status, "PAID");
    assert.equal(r.daysOverdue, 0);
    assert.equal(r.nextPaymentDate, null);
  });

  it("never quietly revives a written-off contract", () => {
    const r = recompute({ ...base, status: "DEFAULTED" }, iso("2026-07-22"));
    assert.equal(r.status, "DEFAULTED");
  });
});

describe("applyPayment", () => {
  it("moves the due date forward one month per full instalment", () => {
    const r = applyPayment(base, base.monthly, iso("2026-07-22"));
    assert.equal(r.nextPaymentDate?.toISOString().slice(0, 10), "2026-08-10");
    assert.equal(r.status, "ACTIVE");
    assert.equal(r.daysOverdue, 0);
  });

  it("clears two months of arrears with a double payment", () => {
    const r = applyPayment(base, base.monthly * 2, iso("2026-08-22"));
    assert.equal(r.nextPaymentDate?.toISOString().slice(0, 10), "2026-09-10");
    assert.equal(r.status, "ACTIVE");
  });

  it("does not let a token payment buy time", () => {
    // Paying 1 so'm must not postpone a lock: the balance drops, the due date
    // does not move, and the contract stays overdue.
    const r = applyPayment(base, 1, iso("2026-07-22"));
    assert.equal(r.paid, base.paid + 1);
    assert.equal(r.nextPaymentDate?.toISOString().slice(0, 10), "2026-07-10");
    assert.equal(r.status, "OVERDUE");
    assert.equal(r.daysOverdue, 12);
  });

  it("settles the contract when the final payment lands", () => {
    const r = applyPayment(base, base.amount - base.paid, iso("2026-07-22"));
    assert.equal(r.status, "PAID");
    assert.equal(r.nextPaymentDate, null);
  });

  it("refuses a non-positive payment", () => {
    assert.throws(() => applyPayment(base, 0), /positive/);
    assert.throws(() => applyPayment(base, -5), /positive/);
  });
});

describe("arrearsDue", () => {
  const base = {
    amount: 9_800_000,
    monthly: 980_000,
    paid: 2_940_000,
    nextPaymentDate: new Date("2026-07-10T00:00:00Z"),
    status: "OVERDUE" as const,
  };

  it("is zero for a contract that is not yet due", () => {
    assert.equal(arrearsDue(base, new Date("2026-07-09T12:00:00Z")), 0);
  });

  it("covers every instalment missed, not just one", () => {
    // Due 10 Jul, today 17 Sep: Jul, Aug and Sep instalments are all behind.
    assert.equal(arrearsDue(base, new Date("2026-09-17T09:00:00Z")), 2_940_000);
  });

  it("is exactly the amount that clears the arrears", () => {
    const now = new Date("2026-09-17T09:00:00Z");
    const after = applyPayment(base, arrearsDue(base, now), now);
    assert.equal(after.status, "ACTIVE");
    assert.equal(after.daysOverdue, 0);
  });

  it("leaves the contract overdue if one so'm less is paid", () => {
    const now = new Date("2026-09-17T09:00:00Z");
    const after = applyPayment(base, arrearsDue(base, now) - base.monthly, now);
    assert.equal(after.status, "OVERDUE");
  });

  it("never exceeds the outstanding balance", () => {
    const nearlyPaid = { ...base, paid: 9_500_000 };
    assert.equal(arrearsDue(nearlyPaid, new Date("2027-09-17T00:00:00Z")), 300_000);
  });

  it("is zero once the loan is fully repaid", () => {
    assert.equal(arrearsDue({ ...base, paid: 9_800_000 }, new Date("2026-09-17T00:00:00Z")), 0);
  });
});
