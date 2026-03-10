import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Shield, Users, Grid, RefreshCw, Key } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Background from '../components/ui/Background';
import api from '../api/axios';

interface AdminStats {
  totalUsers: number;
  totalRooms: number;
}

interface UserData {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        setStats(response.data.stats);
        setUsers(response.data.users);
      } else {
        setError(response.data.message || 'Failed to fetch admin data.');
      }
    } catch (err: any) {
      console.error('Admin API error:', err);
      setError(err.response?.data?.message || 'Failed to fetch admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const changeUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      if (response.data.success) {
        // Optimistically update the local state
        setUsers(prevUsers => prevUsers.map(user => 
            user._id === userId ? { ...user, role: newRole } : user
        ));
      } else {
        alert('Failed to update role.');
      }
    } catch(err: any){
      alert(err.response?.data?.message || 'Error updating user role.');
    }
  };

  return (
    <div className="flex min-h-screen relative bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Background />
      
      {/* Sidebar navigation wrapper with z-index to overlay background animation */}
      <div className="z-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md">
         <Sidebar />
      </div>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto z-10 relative">
        <header className="mb-8 flex justify-between items-center bg-white/70 dark:bg-slate-800/70 p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                Admin Panel
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Manage users and monitor platform metrics.
              </p>
            </div>
          </div>
          
          <Button onClick={fetchAdminData} isLoading={isLoading} aria-label="Refresh Dashboard">
            <RefreshCw size={18} className="mr-2" /> Refresh
          </Button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Users</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white">
                {isLoading ? '...' : stats?.totalUsers || 0}
              </p>
            </div>
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Rooms</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white">
                 {isLoading ? '...' : stats?.totalRooms || 0}
              </p>
            </div>
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
              <Grid className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/40 dark:bg-slate-800/40">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-slate-500" /> Recent Users
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/50 dark:border-slate-700/50">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-700/50">
                {isLoading ? (
                   <tr>
                     <td colSpan={5} className="py-12 text-center text-slate-500">Loading user data...</td>
                   </tr>
                ) : users.length === 0 ? (
                   <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">No users found.</td>
                   </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">{u.displayName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${u.role === 'admin' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button 
                          variant="outline" 
                          onClick={() => changeUserRole(u._id, u.role)}
                          className="gap-2 text-xs px-3 py-1.5 h-auto border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        >
                          <Key size={14} /> Toggle Role
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
