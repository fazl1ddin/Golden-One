// Loan arithmetic, kept pure and free of Prisma so it can be tested directly.
//
// The model is deliberately simple and matches how these contracts are sold:
// a fixed monthly instalment with a due date that moves forward as money
// arrives. Everything downstream — the collections queue, the overdue badge,
// whether a phone may be locked — is derived from this, so it must be boring
// and predictable rather than clever.

export type ContractStatus = "ACTIVE" | "OVERDUE" | "PAID" | "DEFAULTED";

export interface ContractState {
  amount: number;
  monthly: number;
  paid: number;
  nextPaymentDate: Date | null;
  status: ContractStatus;
}

export interface Recomputed {
  paid: number;
  nextPaymentDate: Date | null;
  daysOverdue: number;
  status: ContractStatus;
}

const DAY_MS = 86_400_000;

/** Whole days between two dates, counting only elapsed days. */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  const day = copy.getUTCDate();
  copy.setUTCMonth(copy.getUTCMonth() + months);
  // Guard the 31st-of-a-short-month case: without this, adding a month to
  // 31 January lands in March and the customer silently loses a due date.
  if (copy.getUTCDate() < day) copy.setUTCDate(0);
  return copy;
}

/**
 * Derives the contract's current position from the money received so far.
 *
 * A DEFAULTED contract is never recomputed back into ACTIVE here — writing that
 * off is a decision a person makes, not one a nightly job should reverse.
 */
export function recompute(state: ContractState, now = new Date()): Recomputed {
  const paid = Math.max(0, state.paid);

  if (state.status === "DEFAULTED") {
    return {
      paid,
      nextPaymentDate: state.nextPaymentDate,
      daysOverdue: state.nextPaymentDate ? Math.max(0, daysBetween(state.nextPaymentDate, now)) : 0,
      status: "DEFAULTED",
    };
  }

  // Fully repaid: nothing is due and nothing can be overdue.
  if (paid >= state.amount) {
    return { paid, nextPaymentDate: null, daysOverdue: 0, status: "PAID" };
  }

  let due = state.nextPaymentDate;
  if (!due) {
    return { paid, nextPaymentDate: null, daysOverdue: 0, status: "ACTIVE" };
  }

  const daysOverdue = Math.max(0, daysBetween(due, now));
  return {
    paid,
    nextPaymentDate: due,
    daysOverdue,
    status: daysOverdue > 0 ? "OVERDUE" : "ACTIVE",
  };
}

/**
 * Applies a payment: each full instalment covered pushes the due date one month
 * forward. A part-payment reduces the balance but does not buy time — otherwise
 * a customer could pay 1 so'm to postpone a lock.
 */
export function applyPayment(
  state: ContractState,
  amount: number,
  now = new Date(),
): Recomputed {
  if (amount <= 0) throw new Error("Payment amount must be positive");

  const paid = state.paid + amount;
  if (paid >= state.amount) {
    return { paid, nextPaymentDate: null, daysOverdue: 0, status: "PAID" };
  }

  let due = state.nextPaymentDate;
  if (due && state.monthly > 0) {
    // How many whole instalments this payment (plus any previous overpayment)
    // covers, relative to what was already due.
    const instalmentsCovered = Math.floor(amount / state.monthly);
    if (instalmentsCovered > 0) due = addMonths(due, instalmentsCovered);
  }

  return recompute({ ...state, paid, nextPaymentDate: due }, now);
}

/**
 * What the customer must pay right now to bring the contract current — i.e. to
 * push the due date past today.
 *
 * This exists because a single instalment is not the same thing as "enough".
 * A customer two months behind who pays one instalment stays overdue and stays
 * locked out, so an operator taking money at the counter needs to be told the
 * figure that actually releases the phone rather than working it out in their
 * head. Capped at the outstanding balance: nobody owes more than the loan.
 */
export function arrearsDue(state: ContractState, now = new Date()): number {
  const outstanding = Math.max(0, state.amount - Math.max(0, state.paid));
  if (outstanding === 0) return 0;

  const due = state.nextPaymentDate;
  if (!due || state.monthly <= 0) return 0;
  if (daysBetween(due, now) <= 0) return 0;

  const today = startOfDay(now);
  let instalments = 0;
  // Bounded: a contract cannot need more instalments than its balance covers,
  // and the +1 keeps the loop terminating even on odd monthly amounts.
  const max = Math.ceil(outstanding / state.monthly) + 1;
  while (instalments < max && startOfDay(addMonths(due, instalments)) <= today) {
    instalments += 1;
  }

  return Math.min(instalments * state.monthly, outstanding);
}
