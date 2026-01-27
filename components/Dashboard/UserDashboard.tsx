
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, GraduationCap, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { LicenseRequest } from '../../types';

export const UserDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [activeLicenses, setActiveLicenses] = useState<LicenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await supabase
        .from('license_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'approved');
      
      setActiveLicenses(data || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Olá, {user?.user_metadata?.full_name || 'Trader'}!</h2>
        <p className="text-slate-500">Bem-vindo ao seu painel de controle.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Status da Conta</p>
              <h3 className="text-lg font-bold capitalize text-slate-900">{role === 'client' ? 'Cliente VIP' : role}</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Acesso total liberado</div>
        </div>

        {/* Licenses Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Licenças Ativas</p>
              <h3 className="text-lg font-bold text-slate-900">{activeLicenses.length}</h3>
            </div>
          </div>
           {activeLicenses.length > 0 ? (
             <div className="text-xs text-green-600 font-medium">Operando normalmente</div>
           ) : (
             <div className="text-xs text-yellow-600 font-medium">Nenhuma licença ativa</div>
           )}
        </div>

        {/* Courses Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Academia</p>
              <h3 className="text-lg font-bold text-slate-900">Em Breve</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Continue seus estudos</div>
        </div>
      </div>

      {/* Recent Activity / Licenses List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Suas Contas MT5</h3>
        
        {loading ? (
             <p className="text-slate-400">Carregando...</p>
        ) : activeLicenses.length > 0 ? (
          <div className="space-y-3">
            {activeLicenses.map((license) => (
              <div key={license.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-mono font-medium text-slate-700">{license.mt5_account}</span>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                  ATIVO
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
               <AlertCircle className="text-slate-400" />
            </div>
            <p className="text-slate-500 mb-2">Você ainda não tem licenças ativas.</p>
            <p className="text-sm text-green-600 font-medium">Vá até a aba Licenças para solicitar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
