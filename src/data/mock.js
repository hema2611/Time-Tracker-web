// Sample data only – replaced by API later.

export const projects = [
  { id: 'p1', name: 'Retail ERP', client: 'Acme Retail', tl: 'Arun', phase: 'Phase 1 – Employees', progress: 62, health: 'risk', healthText: '3 days behind', openCR: 6, reverts: 3, clientPending: 2, start: '1 Dec 2026', golive: '29 Jan 2027', baseline: '20 Jan 2027', status: 'Active' },
  { id: 'p2', name: 'Clinic booking app', client: 'CarePlus', tl: 'Priya', phase: 'Phase 2 – Payments', progress: 78, health: 'ok', healthText: 'On track', openCR: 2, reverts: 0, clientPending: 1, start: '1 Sep 2026', golive: '10 Dec 2026', baseline: '10 Dec 2026', status: 'Active' },
  { id: 'p3', name: 'Logistics portal', client: 'FastMove', tl: 'Arun', phase: 'UAT', progress: 91, health: 'late', healthText: 'Client verification stuck', openCR: 5, reverts: 2, clientPending: 3, start: '1 Jul 2026', golive: '30 Nov 2026', baseline: '20 Nov 2026', status: 'Active' },
  { id: 'p4', name: 'School website', client: 'Greenfield School', tl: 'Divya', phase: 'Design', progress: 25, health: 'ok', healthText: 'On track', openCR: 1, reverts: 0, clientPending: 0, start: '1 Nov 2026', golive: '15 Feb 2027', baseline: '15 Feb 2027', status: 'Active' },
  { id: 'p5', name: 'Hotel POS', client: 'BlueBay Hotels', tl: 'Priya', phase: 'Completed', progress: 100, health: 'done', healthText: 'Delivered', openCR: 0, reverts: 1, clientPending: 0, start: '1 Mar 2026', golive: '30 Jun 2026', baseline: '15 Jun 2026', status: 'Completed' },
]

export const users = [
  { id: 1, name: 'Arun', email: 'arun@company.test', role: 'Team lead', projects: ['Retail ERP', 'Logistics portal'], status: 'Active' },
  { id: 2, name: 'Priya', email: 'priya@company.test', role: 'Team lead', projects: ['Clinic booking app', 'Hotel POS'], status: 'Active' },
  { id: 3, name: 'Divya', email: 'divya@company.test', role: 'Team lead', projects: ['School website'], status: 'Active' },
  { id: 4, name: 'Meena', email: 'meena@company.test', role: 'Developer', projects: ['Retail ERP'], status: 'Active' },
  { id: 5, name: 'Karthik', email: 'karthik@company.test', role: 'Developer', projects: ['Retail ERP', 'School website'], status: 'Active' },
  { id: 6, name: 'Ravi', email: 'ravi@company.test', role: 'Developer', projects: ['Retail ERP', 'Clinic booking app'], status: 'Active' },
  { id: 7, name: 'Sowmya', email: 'sowmya@company.test', role: 'Designer', projects: ['School website', 'Clinic booking app'], status: 'Active' },
  { id: 8, name: 'Lakshmi', email: 'lakshmi@company.test', role: 'Tester', projects: ['Logistics portal', 'Retail ERP'], status: 'Active' },
  { id: 9, name: 'Mr. Rao', email: 'rao@acme.test', role: 'Client – approver', projects: ['Retail ERP'], status: 'Active' },
  { id: 10, name: 'Ms. Iyer', email: 'iyer@acme.test', role: 'Client – viewer', projects: ['Retail ERP'], status: 'Invited' },
  { id: 11, name: 'Mr. Khan', email: 'khan@fastmove.test', role: 'Client – approver', projects: ['Logistics portal'], status: 'Active' },
  { id: 12, name: 'Suresh', email: 'suresh@company.test', role: 'Developer', projects: [], status: 'Deactivated' },
]

export const ROLES = ['Admin / HR', 'Team lead', 'Developer', 'Designer', 'Tester', 'Client – approver', 'Client – viewer']

export const permissions = [
  { name: 'See projects', roles: { Client: 'Own', TL: 'Team', Dev: 'Assigned', Tester: 'Assigned', HR: 'All' } },
  { name: 'Raise CR / point', roles: { Client: true, TL: true, Dev: 'Suggest', Tester: false, HR: false } },
  { name: 'Approve CR', roles: { Client: 'Approver only', TL: 'Estimate', Dev: false, Tester: false, HR: false } },
  { name: 'Set batch & assign work', roles: { Client: false, TL: true, Dev: false, Tester: false, HR: false } },
  { name: 'Mark point done', roles: { Client: false, TL: true, Dev: true, Tester: false, HR: false } },
  { name: 'Log / reopen bugs', roles: { Client: true, TL: true, Dev: false, Tester: true, HR: false } },
  { name: 'Verify & close point', roles: { Client: 'Approver only', TL: false, Dev: false, Tester: 'Pre-check', HR: false } },
  { name: 'Run meeting, publish MOM', roles: { Client: false, TL: true, Dev: false, Tester: false, HR: false } },
  { name: 'Confirm MOM', roles: { Client: true, TL: false, Dev: false, Tester: false, HR: false } },
  { name: 'See internal notes', roles: { Client: false, TL: true, Dev: true, Tester: true, HR: true } },
  { name: 'Log work hours', roles: { Client: false, TL: true, Dev: true, Tester: true, HR: false } },
  { name: 'Rework & delay reports', roles: { Client: 'Own summary', TL: true, Dev: false, Tester: false, HR: true } },
  { name: 'Manage users & projects', roles: { Client: false, TL: false, Dev: false, Tester: false, HR: true } },
]

export const team = [
  { name: 'Arun', role: 'Team lead', projects: 'Retail ERP, Logistics portal', hours: 38, split: [26, 6, 2, 4], open: 14, missed: 0 },
  { name: 'Meena', role: 'Developer', projects: 'Retail ERP', hours: 42, split: [24, 10, 4, 4], open: 6, missed: 0 },
  { name: 'Karthik', role: 'Developer', projects: 'Retail ERP, School website', hours: 34, split: [28, 2, 4, 0], open: 4, missed: 1 },
  { name: 'Ravi', role: 'Developer', projects: 'Retail ERP, Clinic app', hours: 30, split: [22, 4, 2, 2], open: 5, missed: 2 },
  { name: 'Sowmya', role: 'Designer', projects: 'School website, Clinic app', hours: 28, split: [24, 4, 0, 0], open: 3, missed: 0 },
  { name: 'Lakshmi', role: 'Tester', projects: 'Logistics portal, Retail ERP', hours: 36, split: [30, 2, 4, 0], open: 9, missed: 0 },
]

// [planned, CR, bug, revert] hours, client reverts, team bugs reopened
export const rework = [
  { project: 'Retail ERP', client: 'Acme Retail', hours: [320, 48, 22, 16], reverts: 3, bugsReopened: 2 },
  { project: 'Logistics portal', client: 'FastMove', hours: [410, 36, 30, 20], reverts: 2, bugsReopened: 4 },
  { project: 'Clinic booking app', client: 'CarePlus', hours: [260, 12, 10, 0], reverts: 0, bugsReopened: 1 },
  { project: 'School website', client: 'Greenfield School', hours: [60, 4, 2, 0], reverts: 0, bugsReopened: 0 },
]

export const clientResponse = [
  { client: 'Acme Retail', crApproval: 3.2, verify: 1.5, momOnTime: 62 },
  { client: 'FastMove', crApproval: 5.8, verify: 2.4, momOnTime: 40 },
  { client: 'CarePlus', crApproval: 1.1, verify: 1.0, momOnTime: 100 },
  { client: 'Greenfield School', crApproval: 2.0, verify: 1.0, momOnTime: 100 },
]

export const delays = [
  { project: 'Retail ERP', milestone: 'Phase 1 – Employees', baseline: '20 Jan', current: '29 Jan', crDays: 9, teamDays: 0, clientWait: 0 },
  { project: 'Logistics portal', milestone: 'Go-live', baseline: '20 Nov', current: '30 Nov', crDays: 4, teamDays: 2, clientWait: 4 },
  { project: 'Clinic booking app', milestone: 'Payments', baseline: '10 Dec', current: '10 Dec', crDays: 0, teamDays: 0, clientWait: 0 },
]

export const sampleProposal = {
  file: 'Proposal_NewProject_v1.pdf',
  modules: [
    { name: 'Employees module', features: [['Employee master', 3], ['Attendance', 3], ['Leave management', 2]] },
    { name: 'Payroll module', features: [['Salary structure', 2], ['Payroll run', 4], ['Payslips & statutory', 2]] },
    { name: 'Reports module', features: [['Standard reports', 2], ['Management dashboard', 2]] },
  ],
  outOfScope: ['Mobile app', 'Biometric device integration'],
}
