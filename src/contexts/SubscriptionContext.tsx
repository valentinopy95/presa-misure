import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, fetchProfile, fetchCompanyPlan, CompanyPlan, SubscriptionStatus } from '../lib/supabase';
import { getAllProjects } from '../storage/database';

export const FREE_PROJECT_LIMIT = 5;

interface SubscriptionContextValue {
  plan:         CompanyPlan;
  status:       SubscriptionStatus;
  projectCount: number;
  canCreate:    boolean;
  loading:      boolean;
  companyId:    string | null;
  refresh:      () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  plan:         'free',
  status:       'free',
  projectCount: 0,
  canCreate:    true,
  loading:      true,
  companyId:    null,
  refresh:      async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan,         setPlan]         = useState<CompanyPlan>('free');
  const [status,       setStatus]       = useState<SubscriptionStatus>('free');
  const [projectCount, setProjectCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [companyId,    setCompanyId]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const profile = await fetchProfile(user.id);
      if (!profile?.company_id) { setLoading(false); return; }

      setCompanyId(profile.company_id);

      const [planData, projects] = await Promise.all([
        fetchCompanyPlan(profile.company_id),
        getAllProjects(),
      ]);

      if (planData) {
        setPlan(planData.plan);
        setStatus(planData.subscription_status);
      }

      setProjectCount(projects.filter(p => !p.parentId).length);
    } catch {
      // non critico
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canCreate =
    (plan !== 'free') ||
    (status === 'active') ||
    (projectCount < FREE_PROJECT_LIMIT);

  return (
    <SubscriptionContext.Provider
      value={{ plan, status, projectCount, canCreate, loading, companyId, refresh: load }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
