import Link from "next/link";
import type { CheckInSchedule, PublicLink } from "@/features/relationships/api-client";
import type { ClientIntake } from "@/features/relationships/api-client";
import { ClientProfileCard } from "./client-profile-card";
import { TrainerProfileCard } from "./trainer-profile-card";
import { OnboardingProgressCard } from "./onboarding-progress-card";

export function OverviewTab({
  link,
  schedules,
  intake,
  viewerId,
}: {
  link: PublicLink;
  schedules: CheckInSchedule[];
  intake: ClientIntake | null;
  viewerId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">CLIENTE</p>
          <ClientProfileCard link={link} schedules={schedules} intake={intake} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">RESPONSÁVEL</p>
          <TrainerProfileCard link={link} />
        </div>
      </div>

      <OnboardingProgressCard link={link} intake={intake} />

      {link.status === "ACTIVE" && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Ações</h3>
          <div className="mt-3 space-y-2">
            <p>
              <Link href={`/clients/${link.id}/intake`} className="text-accent hover:underline text-sm">
                Ver triagem de saúde →
              </Link>
            </p>
            {link.specialization === "PERSONAL_TRAINER" && (
              <>
                <p>
                  <Link href={`/clients/${link.id}/plans`} className="text-accent hover:underline text-sm">
                    Ver planos de treino →
                  </Link>
                </p>
                <p>
                  <Link
                    href={`/clients/${link.id}/training-execution`}
                    className="text-accent hover:underline text-sm"
                  >
                    Ver execução dos treinos →
                  </Link>
                </p>
              </>
            )}
            <p>
              <Link
                href={`/clients/${link.id}/body-assessments`}
                className="text-accent hover:underline text-sm"
              >
                Ver avaliação corporal →
              </Link>
            </p>
            {link.specialization === "NUTRITIONIST" && (
              <p>
                <Link href={`/clients/${link.id}/nutrition`} className="text-accent hover:underline text-sm">
                  Ver nutrição →
                </Link>
              </p>
            )}
            <p>
              <Link href={`/messages/with/${link.client.id}`} className="text-accent hover:underline text-sm">
                Ver mensagens →
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
