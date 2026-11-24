// AI answer from the server -> the shape the timeline screen works with.
// feature = [name, weeks, daysWrittenInProposal]
export const fromAi = (reading, proposal) => ({
  file: proposal.fileName,
  proposalId: proposal.id,
  modules: reading.modules.map(m => ({ name: m.name, features: m.features.map(f => [f.name, f.days ? f.days / 5 : 1, !!f.days]) })),
  outOfScope: reading.outOfScope,
  start: reading.startDate,
  uatDays: reading.uatDays,
  totalMonths: reading.totalMonths,
  statedTotal: reading.statedTotal,
  warnings: reading.warnings || [],
})

export const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
