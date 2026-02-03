import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, Product, PartnerRequest } from '../../types';
import { CheckCircle, XCircle, Package, Users, Activity, Plus } from 'lucide-react';
import { BackButton } from '../BackButton';

interface AdminPanelProps {
  onBack?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'products'>('licenses');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<PartnerRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'licenses') {
        const { data, error } = await supabase
          .from('license_requests')
          .select(`*, profiles:user_id (full_name, email)`) 
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLicenses(data as unknown as LicenseRequest[] || []);
      } else if (activeTab === 'partners') {
        const { data, error } = await supabase
          .from('partner_requests')
          .select(`*, profiles(full_name, email)`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPartners(data as unknown as PartnerRequest[] || []);
      } else {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProducts(data as Product[] || []);
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setErrorMsg(error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await supabase.from('license_requests').update({ status }).eq('id', id);
      fetchData(); // Refresh
    } catch (error) {
      console.error('Error updating license:', error);
    }
  };

  const handlePartnerAction = async (request: PartnerRequest, status: 'approved' | 'rejected') => {
      try {
          // Update request status
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status })
            .eq('id', request.id);
          
          if (reqError) throw reqError;

          // If approved, update user role
          if (status === 'approved') {
              const { error: roleError } = await supabase
                .from('profiles')
                .update({ role: 'partner' })
                .eq('id', request.user_id);
              
              if (roleError) throw roleError;
          }

          fetchData();
      } catch (error: any) {
          console.error("Error updating partner:", error);
          alert("Erro: " + error.message);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && <BackButton onClick={onBack} />}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
            <p className="text-slate-500 text-sm">Gerencie usuários, licenças e conteúdo.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'licenses' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Licenças
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'partners' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Parceiros
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'products' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Produtos e Cursos
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 text-sm">
            Erro: {errorMsg}
          </div>
        )}
        {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando dados...</div>
        ) : activeTab === 'licenses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Conta MT5</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                            {/* @ts-ignore: join profile data */}
                            {lic.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-slate-400">
                            {/* @ts-ignore */}
                            {lic.profiles?.email}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{lic.mt5_account}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(lic.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        lic.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        lic.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lic.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleLicenseAction(lic.id, 'approved')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar">
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleLicenseAction(lic.id, 'rejected')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rejeitar">
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {licenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'partners' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                            {/* @ts-ignore */}
                            {req.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-slate-400">
                            {/* @ts-ignore */}
                            {req.profiles?.email}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                         {req.status === 'pending' ? 'Solicitado' : req.status === 'approved' ? 'Parceiro' : req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handlePartnerAction(req, 'approved')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar e Tornar Parceiro">
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handlePartnerAction(req, 'rejected')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rejeitar">
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação de parceria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700">Catálogo de Produtos</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                    <Plus size={16} /> Novo Produto
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(prod => (
                    <div key={prod.id} className="border border-slate-200 rounded-xl p-4 flex gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                            {prod.image_url && <img src={prod.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 line-clamp-1">{prod.title}</h4>
                            <span className="text-xs uppercase font-semibold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{prod.type}</span>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
