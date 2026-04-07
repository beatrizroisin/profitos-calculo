// src/lib/runrunit.ts — RunRun.it API client

const BASE = 'https://runrun.it/api/v1.0';

export interface RunRunUser {
  id: string;
  name: string;
  email: string;
  time_worked: number; // in minutes
}

export interface RunRunTask {
  id: number;
  title: string;
  client_id: number;
  client_name: string;
  time_worked: number; // in minutes
  closed_at: string | null;
  is_closed: boolean;
}

export interface RunRunTimesheet {
  id: number;
  user_id: string;
  task_id: number;
  task_title: string;
  client_id: number;
  client_name: string;
  started_at: string;
  ended_at: string;
  duration: number; // minutes
}

export interface RunRunClient {
  id: number;
  name: string;
  time_worked: number; // minutes
  budgeted_hours_month: number;
}

function headers(appKey: string, userToken: string) {
  return {
    'App-Key':       appKey,
    'User-Token':    userToken,
    'Content-Type':  'application/json',
    'Version':       'HTTP/1.0',
  };
}

// Test connection — returns enterprise info
export async function testConnection(appKey: string, userToken: string) {
  const res = await fetch(`${BASE}/enterprises`, {
    headers: headers(appKey, userToken),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: credenciais inválidas ou sem permissão.`);
  return res.json();
}

// List all users
export async function getUsers(appKey: string, userToken: string): Promise<RunRunUser[]> {
  const res = await fetch(`${BASE}/users?is_active=true`, {
    headers: headers(appKey, userToken),
  });
  if (!res.ok) throw new Error(`Erro ao buscar usuários: HTTP ${res.status}`);
  return res.json();
}

// Get time worked by user for a date range (via tasks)
export async function getUserTimeEntries(
  appKey: string,
  userToken: string,
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<RunRunTask[]> {
  const url = `${BASE}/tasks?responsible_id=${userId}&since=${startDate}&until=${endDate}&limit=200`;
  const res = await fetch(url, { headers: headers(appKey, userToken) });
  if (!res.ok) throw new Error(`Erro ao buscar tarefas do usuário ${userId}: HTTP ${res.status}`);
  return res.json();
}

// Get timesheets for a period
export async function getTimesheets(
  appKey: string,
  userToken: string,
  startDate: string,
  endDate: string,
  userId?: string
): Promise<RunRunTimesheet[]> {
  let url = `${BASE}/timesheets?start_date=${startDate}&end_date=${endDate}&limit=500`;
  if (userId) url += `&user_id=${userId}`;
  const res = await fetch(url, { headers: headers(appKey, userToken) });
  if (!res.ok) throw new Error(`Erro ao buscar timesheets: HTTP ${res.status}`);
  return res.json();
}

// Get clients with time_worked
export async function getClients(appKey: string, userToken: string): Promise<RunRunClient[]> {
  const res = await fetch(`${BASE}/clients`, { headers: headers(appKey, userToken) });
  if (!res.ok) throw new Error(`Erro ao buscar clientes: HTTP ${res.status}`);
  return res.json();
}

// Helper: get current month date range
export function currentMonthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  };
}

// Minutes → hours (2 decimals)
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}
