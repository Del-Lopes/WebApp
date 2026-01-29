import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Share2, Edit2, Plus, Trash2, Save, X } from 'lucide-react';
import { MOCK_ASSETS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MarketingAsset } from '../types';

export const Marketing: React.FC = () => {
  const { role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [assets, setAssets] = useState<MarketingAsset[]>([]); // We need a state for assets now
  
  // Fetch assets or use mock initial
  useEffect(() => {
    // Ideally fetch from DB here
    // setAssets(MOCK_ASSETS); 
    // For now mocking persistence via local state + potential DB logic later
    const fetchAssets = async () => {
        const { data } = await supabase.from('marketing_assets').select('*');
        if (data) {
             setAssets(data as MarketingAsset[]);
        } else {
             // Fallback or init
             // setAssets(prev => prev.length ? prev : MOCK_ASSETS);
        }
    }
    // temporary fallback until DB table created
    // setAssets(prev => prev.length ? prev : MOCK_ASSETS_TYPED); 
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-green-500">
          <Share2 size={120} />
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl font-bold text-white mb-2">Central de Marketing</h2>
          <p className="text-slate-300 mb-6">Baixe materiais oficiais para promover a plataforma e expandir sua rede de afiliados.</p>
          <button className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/30 border border-green-500/50">
            Copiar Link de Afiliado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_ASSETS.map((asset) => (
          <div key={asset.id} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-green-500/30 transition-colors group shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                asset.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-500'
              }`}>
                {asset.type === 'PDF' ? <FileText size={24} /> : <ImageIcon size={24} />}
              </div>
              <div>
                <h4 className="text-slate-900 font-medium group-hover:text-green-600 transition-colors">{asset.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-semibold">{asset.type}</span>
                  <span>•</span>
                  <span>{asset.size}</span>
                </div>
              </div>
            </div>
            
            <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Download">
              <Download size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};