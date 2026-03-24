import { useState, useEffect } from 'react';
import { SystemConfig } from '../types';
import { getSystemConfig, onSystemConfigChange } from '../services/configService';

export const useSystemConfig = () => {
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial fetch
        getSystemConfig().then(res => {
            if (res.success && res.data) {
                setConfig(res.data);
            }
            setLoading(false);
        });

        // Subscribe to changes
        const unsubscribe = onSystemConfigChange((newConfig) => {
            setConfig(newConfig);
        });

        return () => unsubscribe();
    }, []);

    return {
        config,
        loading,
        activeTerm: config?.term,
        activeYear: config?.year
    };
};
