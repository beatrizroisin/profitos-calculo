'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Alert, Button } from '@/components/ui';
import { canManageRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/auth';

interface User { id:string; name:string; email:string; role:string; isActive:boolean; lastLoginAt:string|null; avatarUrl:string|null; googleId:string|null; createdAt:string; }
interface Invite { id:string; email:string; name:string|null; role:string; status:string; expiresAt:string; createdAt:string; }

const ROLE_COLOR: Record<string,string> = {
  OWNER:   'bg-purple-50 text-purple-800',
  ADMIN:   'bg-blue-50 text-blue-800',
  MANAGER: 'bg-green-50 text-green-800',
  MEMBER:  'bg-gray-100 text-gray-700',
  VIEWER:  'bg-gray-50 text-gray-500',
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const me = session?.user as any;

  const [users,   setUsers]   = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]     = useState('');
  const [error, setError]     = useState('');

  // Invite form
  const [iEmail, setIEmail] = useState('');
  const [iName,  setIName]  = useState('');
  const [iRole,  setIRole]  = useState('MEMBER');
  const [iLink,  setILink]  = useState('');
  const [iSaving,setISaving]= useState(false);

  useEffect(() => { if (me) fetchAll(); }, [me]);

  async function fetchAll() {
    setLoading(true);
    const [u, i] = await Promise.all([
      fetch('/api/users').then(r => r.ok ? r.json() : []),
      fetch('/api/users/invite').then(r => r.ok ? r.json() : []),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setInvites(Array.isArray(i) ? i : []);
    setLoading(false);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setILink(''); setISaving(true);
    const res  = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: iEmail, name: iName, role: iRole }),
    });
    const data = await res.json();
    setISaving(false);
    if (!res.ok) { setError(data.error || 'Erro ao criar convite.'); return; }
    setILink(data.inviteUrl);
    setIEmail(''); setIName('');
    setSaved('Convite criado com sucesso!');
    setTimeout(() => setSaved(''), 4000);
    fetchAll();
  }

  async function changeRole(userId: string, newRole: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) { setSaved('Role atualizado.'); setTimeout(()=>setSaved(''),3000); fetchAll(); }
    else { const d = await res.json(); setError(d.error || 'Erro.'); }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) { setSaved(`Usuário ${isActive ? 'desativado' : 'ativado'}.`); setTimeout(()=>setSaved(''),3000); fetchAll(); }
    else { const d = await res.json(); setError(d.error || 'Erro.'); }
  }

  async function removeUser(userId: string, name: string) {
    if (!confirm(`Remover ${name} permanentemente?`)) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) { setSaved('Usuário removido.'); setTimeout(()=>setSaved(''),3000); fetchAll(); }
    else { const d = await res.json(); setError(d.error || 'Erro.'); }
  }

  async function cancelInvite(id: string) {
    await fetch(`/api/users/invite/${id}/cancel`, { method: 'POST' });
    fetchAll();
  }

  if (!me || !['OWNER','ADMIN'].includes(me.role)) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" fill="none" stroke="#DC3545" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Acesso restrito</p>
        <p className="text-xs text-gray-400 mt-1">Somente Proprietários e Administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] bg-white text-gray-800 placeholder-gray-400";
  const pendingInvites = invites.filter(i => i.status === 'PENDING' && new Date(i.expiresAt) > new Date());

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Gestão de usuários</h1>
        <p className="text-sm text-gray-400 mt-0.5">{users.length} usuários na empresa · Você é {ROLE_LABELS[me.role] || me.role}</p>
      </div>

      {saved && <Alert variant="ok">{saved}</Alert>}
      {error && <Alert variant="danger">{error} <button className="ml-2 underline" onClick={() => setError('')}>×</button></Alert>}

      {/* Convidar */}
      <Card title="Convidar novo usuário" subtitle="O convidado receberá um link para criar sua senha ou entrar com Google">
        <form onSubmit={sendInvite}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">E-mail *</label>
              <input type="email" required className={inp} placeholder="usuario@empresa.com" value={iEmail} onChange={e => setIEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nome (opcional)</label>
              <input type="text" className={inp} placeholder="Nome do usuário" value={iName} onChange={e => setIName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nível de acesso</label>
              <select className={inp} value={iRole} onChange={e => setIRole(e.target.value)}>
                {(['ADMIN','MANAGER','MEMBER','VIEWER'] as const).filter(r => me.role === 'OWNER' || canManageRole(me.role, r)).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          {iRole && (
            <p className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded-lg">{ROLE_DESCRIPTIONS[iRole]}</p>
          )}
          <button type="submit" disabled={iSaving}
            className="px-5 py-2 bg-[#1A6B4A] text-white text-sm font-medium rounded-lg hover:bg-[#0F4A33] disabled:opacity-60 transition-colors">
            {iSaving ? 'Gerando link...' : 'Gerar link de convite'}
          </button>
        </form>

        {iLink && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs font-semibold text-green-800 mb-2">Link de convite gerado (válido por 7 dias):</p>
            <div className="flex gap-2">
              <input readOnly value={iLink} className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-xs font-mono text-gray-700" onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { navigator.clipboard?.writeText(iLink); setSaved('Link copiado!'); setTimeout(()=>setSaved(''),2000); }}
                className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">Copiar</button>
            </div>
            <p className="text-[10px] text-green-700 mt-2">O convidado pode entrar com e-mail/senha ou usar o Google para aceitar.</p>
          </div>
        )}
      </Card>

      {/* Roles legend */}
      <Card title="Níveis de acesso" subtitle="Referência das permissões por role">
        <div className="grid grid-cols-5 gap-2">
          {(['OWNER','ADMIN','MANAGER','MEMBER','VIEWER'] as const).map(r => (
            <div key={r} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${ROLE_COLOR[r]}`}>{ROLE_LABELS[r]}</span>
              <p className="text-[10px] text-gray-500 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Active users */}
      <Card title={`Usuários ativos (${users.filter(u=>u.isActive).length})`} subtitle="Clique no role para alterar — somente Proprietário e Admin têm acesso">
        {loading ? <p className="text-xs text-gray-400 text-center py-8">Carregando...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:700}}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Usuário</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">E-mail</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Acesso</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Login</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Auth</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === me.id;
                  const canEdit = !isMe && canManageRole(me.role, u.role);
                  return (
                    <tr key={u.id} className={`border-b border-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            : <div className="w-7 h-7 rounded-full bg-[#1A6B4A] flex items-center justify-center text-[10px] font-semibold text-white">{u.name.slice(0,2).toUpperCase()}</div>
                          }
                          {u.name} {isMe && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">(você)</span>}
                        </div>
                      </td>
                      <td className="py-3 text-gray-500">{u.email}</td>
                      <td className="py-3">
                        {canEdit ? (
                          <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLOR[u.role]}`}>
                            {(['ADMIN','MANAGER','MEMBER','VIEWER'] as const).filter(r => canManageRole(me.role, r)).map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                            <option value={u.role}>{ROLE_LABELS[u.role]}</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLOR[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                      <td className="py-3">
                        {u.googleId
                          ? <span className="flex items-center gap-1 text-[10px] text-gray-500"><svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Google</span>
                          : <span className="text-[10px] text-gray-400">Senha</span>
                        }
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => toggleActive(u.id, u.isActive)}
                              className="text-[11px] font-medium text-amber-600 hover:text-amber-800 transition-colors">
                              {u.isActive ? 'Desativar' : 'Ativar'}
                            </button>
                            {me.role === 'OWNER' && (
                              <button onClick={() => removeUser(u.id, u.name)}
                                className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors">Remover</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card title={`Convites pendentes (${pendingInvites.length})`} subtitle="Aguardando aceitação — válidos por 7 dias">
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-gray-800">{inv.name || inv.email}</p>
                  <p className="text-[10px] text-gray-500">{inv.email} · Expira: {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[inv.role]}`}>{ROLE_LABELS[inv.role]}</span>
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Pendente</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
