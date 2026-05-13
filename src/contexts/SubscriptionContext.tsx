import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, fetchProfile, fetchCompanyPlan, CompanyPlan, SubscriptionStatus, getCompanyUserCount } from '../lib/supabase';
import { getAllProjects } from '../storage/database';
import { getCatalogSeries } from '../storage/settings';

export const FREE_PROJECT_LIMIT = 3;

export const PLAN_SERIES_LIMIT: Record<CompanyPlan, number> = { free: 0, base: 2, pro: 5 };
export const PLAN_USER_LIMIT:   Record<CompanyPlan, number> = { free: 1, base: 2, pro: 5 };

interface SubscriptionContextValue {
  plan:              CompanyPlan;
  status:            SubscriptionStatus;
  projectCount:      number;
  canCreate:         boolean;
  loading:           boolean;
  companyId:         string | null;
  // Series
  seriesCount:       number;
  seriesLimit:       number;
  canAddSeries:      boolean;
  canBuyExtraSlots:  boolean;   // true solo per piano Pro
  extraSeriesSlots:  number;
  // Users
  userCount:         number;
  userLimit:         number;
  canAddUser:        boolean;
  extraUserSlots:    number;
  refresh:           () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  plan:             'free',
  status:           'free',
  projectCount:     0,
  canCreate:        true,
  loading:          true,
  companyId:        null,
  seriesCount:      0,
  seriesLimit:      0,
  canAddSeries:     false,
  canBuyExtraSlots: false,
  extraSeriesSlots: 0,
  userCount:        1,
  userLimit:        1,
  canAddUser:       false,
  extraUserSlots:   0,
  refresh:          async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan,             setPlan]             = useState<CompanyPlan>('free');
  const [status,           setStatus]           = useState<SubscriptionStatus>('free');
  const [projectCount,     setProjectCount]     = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [companyId,        setCompanyId]        = useState<string | null>(null);
  const [extraSeriesSlots, setExtraSeriesSlots] = useState(0);
  const [extraUserSlots,   setExtraUserSlots]   = useState(0);
  const [seriesCount,      setSeriesCount]      = useState(0);
  const [userCount,        setUserCount]        = useState(1);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const profile = await fetchProfile(user.id);
      if (!profile?.company_id) { setLoading(false); return; }

      setCompanyId(profile.company_id);

      const [planData, projects, series, uCount] = await Promise.all([
        fetchCompanyPlan(profile.company_id),
        getAllProjects(),
        getCatalogSeries(),
        getCompanyUserCount(profile.company_id),
      ]);

      if (planData) {
        setPlan(planData.plan);
        setStatus(planData.subscription_status);
        setExtraSeriesSlots(planData.extra_series_slots);
        setExtraUserSlots(planData.extra_user_slots);
      }

      setProjectCount(projects.filter(p => !p.parentId).length);
      setSeriesCount(series.length);
      setUserCount(uCount);
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

  const seriesLimit    = PLAN_SERIES_LIMIT[plan] + extraSeriesSlots;
  const userLimit      = PLAN_USER_LIMIT[plan]   + extraUserSlots;
  const canAddSeries   = plan !== 'free' && status === 'active' && seriesCount < seriesLimit;
  const canAddUser     = plan !== 'free' && status === 'active' && userCount   < userLimit;
  // Gli slot extra sono acquistabili solo con piano Pro
  const canBuyExtraSlots = plan === 'pro' && status === 'active';

  return (
    <SubscriptionContext.Provider
      value={{
        plan, status, projectCount, canCreate, loading, companyId,
        seriesCount, seriesLimit, canAddSeries, canBuyExtraSlots, extraSeriesSlots,
        userCount, userLimit, canAddUser, extraUserSlots,
        refresh: load,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
