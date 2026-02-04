import React, { useEffect, useState } from 'react';
import { fetchBranches } from '../services/api';

interface Branch {
    id: string;
    name: string;
    image_url?: string;
    city?: string;
    address?: string;
}

interface BranchSelectionModalProps {
    onSelectBranch: (branchId: string, branchName: string) => void;
}

const BranchSelectionModal: React.FC<BranchSelectionModalProps> = ({ onSelectBranch }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await fetchBranches();
                setBranches(data || []);
            } catch (error) {
                console.error('Failed to load branches', error);
            } finally {
                setLoading(false);
            }
        };
        loadBranches();
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="font-bold text-gray-500">Cargando restaurantes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-black mb-2">Selecciona un Restaurante</h2>
                    <p className="text-gray-500 font-medium">Elige una sucursal para ver el menú</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            onClick={() => onSelectBranch(branch.id, branch.name)}
                            className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-black hover:bg-gray-50 transition-all duration-300 text-left w-full active:scale-[0.98]"
                        >
                            {branch.image_url ? (
                                <img src={branch.image_url} alt={branch.name} className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:scale-110 transition-transform" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl group-hover:bg-white group-hover:shadow-sm transition-all">
                                    🏪
                                </div>
                            )}
                            <div>
                                <h3 className="font-black text-lg group-hover:text-black">{branch.name}</h3>
                                {branch.city && <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{branch.city}</p>}
                                {branch.address && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{branch.address}</p>}
                            </div>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-2xl">
                                ➡️
                            </div>
                        </button>
                    ))}

                    {branches.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold">No hay restaurantes disponibles.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BranchSelectionModal;
