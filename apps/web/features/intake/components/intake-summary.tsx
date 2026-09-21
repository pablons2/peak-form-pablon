import { PARQ_QUESTIONS, BODY_REGION_LABELS, MEDICAL_CONDITION_LABELS } from "../labels";
import type { PublicIntake } from "../api-client";

// PRD 03 §5.2/§5.4 — read-only view of a finalized (or draft-in-review)
// intake: the contraindications profile, the raw pain flags/conditions that
// produced it, and — when the caller passed them — the Professional's
// clinical annotations. Reused by both the Client's own "/intake" page and
// the Professional's "/clients/[linkId]/intake" review page; annotations are
// omitted entirely for the Client-facing render (the API doesn't even send
// them to a Client — see intake.serializer.ts).
export function IntakeSummary({ intake }: { intake: PublicIntake }) {
  const advisoryQuestions = PARQ_QUESTIONS.filter(
    (q) => intake.parqAnswers?.[q.code] === true,
  );

  return (
    <div className="space-y-4">
      {advisoryQuestions.length > 0 ? (
        <p
          role="status"
          className="rounded-md bg-accent/10 px-3 py-2 text-sm text-foreground"
        >
          Recomendação: consultar um médico antes de iniciar um novo programa
          de exercícios. Isso não é um diagnóstico.
        </p>
      ) : null}

      <section>
        <h3 className="text-sm font-medium text-foreground">Contraindicações</h3>
        {intake.contraindicationTagCodes.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma identificada.</p>
        ) : (
          <ul className="mt-1 list-inside list-disc text-sm text-foreground">
            {intake.contraindicationTagCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-foreground">
          Regiões com dor sinalizadas
        </h3>
        {intake.painFlags.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma sinalizada.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {intake.painFlags.map((flag) => (
              <li key={flag.id}>
                {BODY_REGION_LABELS[flag.region] ?? flag.region} — intensidade{" "}
                {flag.severity}/10 (
                {flag.pastOrCurrent === "CURRENT" ? "atual" : "passado"})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-foreground">Condições médicas</h3>
        {intake.medicalConditions.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma informada.</p>
        ) : (
          <ul className="mt-1 list-inside list-disc text-sm text-foreground">
            {intake.medicalConditions.map((c) => (
              <li key={c}>{MEDICAL_CONDITION_LABELS[c] ?? c}</li>
            ))}
          </ul>
        )}
        {intake.medicalConditionsOtherNote ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Outra: {intake.medicalConditionsOtherNote}
          </p>
        ) : null}
        {intake.medications ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Medicamentos: {intake.medications}
          </p>
        ) : null}
      </section>

      {intake.availability || intake.equipmentAccess ? (
        <section>
          <h3 className="text-sm font-medium text-foreground">
            Disponibilidade e equipamentos
          </h3>
          {intake.availability ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {intake.availability.daysPerWeek}x por semana,{" "}
              {intake.availability.sessionDurationMinutes} min por sessão
            </p>
          ) : null}
          {intake.equipmentAccess ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {intake.equipmentAccess.location === "HOME" ? "Casa" : "Academia"}
              {intake.equipmentAccess.homeEquipment.length > 0
                ? ` — ${intake.equipmentAccess.homeEquipment.join(", ")}`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {intake.annotations ? (
        <section>
          <h3 className="text-sm font-medium text-foreground">
            Anotações do profissional
          </h3>
          {intake.annotations.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nenhuma anotação ainda.
            </p>
          ) : (
            <ul className="mt-1 space-y-2">
              {intake.annotations.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-border p-2 text-sm text-foreground"
                >
                  <p>{a.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.professional.fullName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
