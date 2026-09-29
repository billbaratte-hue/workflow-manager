import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFeatures, updateFeature as apiUpdateFeature, batchUpdateFeatures as apiBatchUpdateFeatures } from '../lib/api';
import { SystemFeature } from '../types';

interface FeaturesContextType {
    features: SystemFeature[];
    loading: boolean;
    isFeatureEnabled: (key: string) => boolean;
    toggleFeature: (key: string, enabled?: boolean) => Promise<boolean>;
    batchSaveFeatures: (updates: Record<string, boolean>) => Promise<boolean>;
    refreshFeatures: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextType>({
    features: [],
    loading: true,
    isFeatureEnabled: () => true,
    toggleFeature: async () => false,
    batchSaveFeatures: async () => false,
    refreshFeatures: async () => {},
});

export const FeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [features, setFeatures] = useState<SystemFeature[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshFeatures = useCallback(async () => {
        try {
            const res = await getFeatures();
            if (res.data?.features && Array.isArray(res.data.features)) {
                const normalized: SystemFeature[] = res.data.features.map((f: any) => {
                    const isEnabledBool = (f.is_enabled === true || f.is_enabled === 1 || f.is_enabled === '1') && 
                                          f.is_enabled !== 0 && f.is_enabled !== '0' && f.is_enabled !== false && f.is_enabled !== 'false';
                    return {
                        ...f,
                        label: f.label || f.name || f.key || '',
                        name: f.name || f.label || f.key || '',
                        description: f.description || '',
                        category: f.category || 'Général',
                        is_enabled: isEnabledBool
                    };
                });
                setFeatures(normalized);
            }
        } catch (err) {
            console.error('Erreur chargement des fonctionnalités système:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshFeatures();
    }, [refreshFeatures]);

    const isFeatureEnabled = useCallback((key: string): boolean => {
        if (!key) return true;
        const lowerKey = String(key).toLowerCase();
        const feat = features.find(f => f && f.key && String(f.key).toLowerCase() === lowerKey);
        if (!feat) return true; // Default fallback to enabled if not found
        return Boolean(feat.is_enabled);
    }, [features]);

    const toggleFeature = useCallback(async (key: string, explicitEnabled?: boolean): Promise<boolean> => {
        if (!key) return false;
        const lowerKey = String(key).toLowerCase();
        const feat = features.find(f => f && f.key && String(f.key).toLowerCase() === lowerKey);
        const targetState = explicitEnabled !== undefined ? explicitEnabled : !(feat ? feat.is_enabled : true);

        // Optimistic UI update
        setFeatures(prev => prev.map(f => (f && f.key && String(f.key).toLowerCase() === lowerKey) ? { ...f, is_enabled: targetState } : f));

        try {
            await apiUpdateFeature(key, targetState);
            await refreshFeatures();
            return true;
        } catch (err) {
            console.error(`Erreur mise à jour de la fonctionnalité '${key}':`, err);
            // Revert optimistic update
            await refreshFeatures();
            throw err;
        }
    }, [features, refreshFeatures]);

    const batchSaveFeatures = useCallback(async (updates: Record<string, boolean>): Promise<boolean> => {
        // Optimistic update
        setFeatures(prev => prev.map(f => updates[f.key] !== undefined ? { ...f, is_enabled: updates[f.key] } : f));

        try {
            await apiBatchUpdateFeatures(updates);
            await refreshFeatures();
            return true;
        } catch (err) {
            console.error('Erreur mise à jour par lot des fonctionnalités:', err);
            await refreshFeatures();
            throw err;
        }
    }, [refreshFeatures]);

    return (
        <FeaturesContext.Provider
            value={{
                features,
                loading,
                isFeatureEnabled,
                toggleFeature,
                batchSaveFeatures,
                refreshFeatures
            }}
        >
            {children}
        </FeaturesContext.Provider>
    );
};

export const useFeatures = () => useContext(FeaturesContext);
