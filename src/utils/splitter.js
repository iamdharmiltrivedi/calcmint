// Compute who owes whom in a group, using a balance-based settlement algorithm.
// Greedy: repeatedly pair the most-positive balance with the most-negative.
export function computeSettlements(members, bills) {
  if (!members?.length || !bills?.length) return { balances: {}, transfers: [] };

  const balances = {};
  members.forEach((m) => { balances[m.id] = 0; });

  bills.forEach((b) => {
    if (!b.amount || !b.paidBy) return;
    balances[b.paidBy] = (balances[b.paidBy] || 0) + b.amount;
    // Equal split among included members
    const share = b.amount / b.participants.length;
    b.participants.forEach((pid) => {
      balances[pid] = (balances[pid] || 0) - share;
    });
  });

  // Round balances to paise to avoid floating-point grit
  Object.keys(balances).forEach((k) => { balances[k] = Math.round(balances[k] * 100) / 100; });

  const transfers = [];
  const pos = Object.entries(balances).filter(([, v]) => v > 0.01).map(([id, v]) => ({ id, v }));
  const neg = Object.entries(balances).filter(([, v]) => v < -0.01).map(([id, v]) => ({ id, v: -v }));

  pos.sort((a, b) => b.v - a.v);
  neg.sort((a, b) => b.v - a.v);

  let i = 0, j = 0;
  while (i < pos.length && j < neg.length) {
    const give = Math.min(pos[i].v, neg[j].v);
    transfers.push({ from: neg[j].id, to: pos[i].id, amount: Math.round(give * 100) / 100 });
    pos[i].v -= give;
    neg[j].v -= give;
    if (pos[i].v < 0.01) i++;
    if (neg[j].v < 0.01) j++;
  }

  return { balances, transfers };
}
