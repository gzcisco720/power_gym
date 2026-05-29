import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Dumbbell, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { variants } from '@/lib/animations/variants';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  action?: React.ReactNode;
  accentClass?: string;
}

function PathCard({ icon, title, subtitle, description, action, accentClass = 'bg-primary/10 text-primary-light' }: PathCardProps) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-foreground/65 mt-0.5">{subtitle}</div>
        </div>
      </div>
      <p className="text-xs text-foreground/65">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function MemberMyTrainingPage() {
  const { user } = useAuthStore();
  const { memberPlans, memberSessions, fetchMemberPlan, fetchSessions, startSession, activeSession } = useTrainingStore();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const memberId = user?.id ?? '';
  const memberPlan = memberPlans[memberId];
  const sessions = memberSessions[memberId] ?? [];
  const isLoading = !(memberId in memberPlans);

  useEffect(() => {
    if (memberId && !(memberId in memberPlans)) {
      void fetchMemberPlan(memberId);
    }
  }, [memberId, memberPlans, fetchMemberPlan]);

  useEffect(() => {
    if (memberId && !(memberId in memberSessions)) {
      void fetchSessions(memberId);
    }
  }, [memberId, memberSessions, fetchSessions]);

  // Navigate to session when one becomes active
  useEffect(() => {
    if (activeSession && !activeSession.completedAt) {
      navigate(`/member/my-training/session/${activeSession._id}`);
    }
  }, [activeSession, navigate]);

  async function handleStartSession() {
    if (!memberPlan) return;
    try {
      // Start from day 1 by default; member can progress naturally
      await startSession(memberId, 1);
    } catch {
      toast.error('Failed to start session. Please try again.');
    }
  }

  const containerVariant = reducedMotion ? {} : variants.staggerContainer;
  const itemVariant = reducedMotion ? {} : variants.staggerItem;

  const subtitle = memberPlan
    ? `Active: ${memberPlan.name}`
    : isLoading
      ? 'Loading…'
      : 'No plan assigned';

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col min-h-screen">
        <PageHeader title="My Training" subtitle={subtitle} />

        <div className="px-4 sm:px-8 py-6 max-w-3xl mx-auto w-full space-y-4">
          <ActivityStrip sessions={sessions} />
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
            </div>
          ) : (
            <m.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              variants={containerVariant}
              initial="hidden"
              animate="visible"
            >
              {/* My Plan path card */}
              <m.div variants={itemVariant}>
                <PathCard
                  icon={<Dumbbell className="size-5" />}
                  title="My Plan"
                  subtitle={memberPlan ? memberPlan.name : 'No plan assigned'}
                  description={
                    memberPlan
                      ? `${memberPlan.days.length} day${memberPlan.days.length !== 1 ? 's' : ''} in this plan. Follow your trainer-assigned programme.`
                      : 'Ask your trainer to assign a plan to get started.'
                  }
                  accentClass="bg-primary/10 text-primary-light"
                  action={
                    memberPlan ? (
                      <Button
                        size="sm"
                        onClick={() => void handleStartSession()}
                        className="w-full"
                      >
                        Start Session
                      </Button>
                    ) : undefined
                  }
                />
              </m.div>

              {/* Freestyle path card */}
              <m.div variants={itemVariant}>
                <PathCard
                  icon={<Zap className="size-5" />}
                  title="Freestyle"
                  subtitle="Log any workout"
                  description="Start a free-form session and log any exercises you choose, without a programme."
                  accentClass="bg-amber-500/10 text-amber-400"
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => void handleStartSession()}
                    >
                      Start Freestyle
                    </Button>
                  }
                />
              </m.div>
            </m.div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
