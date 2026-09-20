"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCustomExerciseSchema,
  difficultySchema,
  equipmentSchema,
  muscleGroupSchema,
  type CreateCustomExerciseInput,
} from "@peakform/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  FormError,
  SubmitButton,
  TextField,
  inputClass,
} from "../../auth/components/fields";
import {
  createCustomExerciseAction,
  updateCustomExerciseAction,
} from "../actions";
import type {
  PublicContraindicationTag,
  PublicExercise,
} from "../api-client";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
} from "../labels";

const checkboxClass = "h-4 w-4 rounded border-input accent-primary";

function CheckboxGrid({
  legend,
  name,
  options,
  labels,
  register,
  error,
}: {
  legend: string;
  name: "muscleGroups" | "equipment" | "contraindicationCodes";
  options: readonly string[];
  labels: Record<string, string>;
  register: ReturnType<typeof useForm<CreateCustomExerciseInput>>["register"];
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              value={option}
              className={checkboxClass}
              {...register(name)}
            />
            {labels[option] ?? option}
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      ) : null}
    </fieldset>
  );
}

// Editable string-list (cues/mistakes are `string[]` in the shared schema).
// useFieldArray is intentionally not used: it only types arrays of objects,
// and reshaping the form values would drift them away from the shared zod
// schema. Rows render from useWatch and add/remove go through setValue.
function StringListEditor({
  legend,
  addLabel,
  name,
  items,
  register,
  setValue,
  error,
}: {
  legend: string;
  addLabel: string;
  name: "cues" | "mistakes";
  items: string[];
  register: ReturnType<typeof useForm<CreateCustomExerciseInput>>["register"];
  setValue: ReturnType<typeof useForm<CreateCustomExerciseInput>>["setValue"];
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="mt-2 space-y-2">
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={inputClass}
              aria-label={`${legend} ${i + 1}`}
              {...register(`${name}.${i}`)}
            />
            <button
              type="button"
              onClick={() =>
                setValue(
                  name,
                  items.filter((_, j) => j !== i),
                  { shouldValidate: false },
                )
              }
              aria-label={`Remover item ${i + 1}`}
              className="shrink-0 rounded-md border border-border px-2 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setValue(name, [...items, ""])}
        className="mt-2 text-sm font-medium text-accent hover:underline"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

// PRD 05 §5.3 — custom-exercise authoring (create + edit share the form).
// Visibility is never a form field: created PRIVATE by the API, promoted to
// global only by an Admin's separate review action.
export function ExerciseForm({
  contraindicationTags,
  exercise,
}: {
  contraindicationTags: PublicContraindicationTag[];
  exercise?: PublicExercise;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const isEdit = Boolean(exercise);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomExerciseInput>({
    resolver: zodResolver(createCustomExerciseSchema),
    defaultValues: exercise
      ? {
          name: exercise.name,
          mediaUrl: exercise.mediaUrl ?? "",
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          cues: exercise.cues,
          mistakes: exercise.mistakes,
          contraindicationCodes: exercise.contraindicationTags.map(
            (t) => t.code,
          ),
        }
      : {
          name: "",
          mediaUrl: "",
          muscleGroups: [],
          equipment: [],
          difficulty: "BEGINNER",
          cues: [""],
          mistakes: [""],
          contraindicationCodes: [],
        },
  });
  const cues = useWatch({ control, name: "cues" }) ?? [];
  const mistakes = useWatch({ control, name: "mistakes" }) ?? [];

  async function onSubmit(values: CreateCustomExerciseInput) {
    setServerError(undefined);
    const input = { ...values, mediaUrl: values.mediaUrl || null };
    const result = exercise
      ? await updateCustomExerciseAction(exercise.id, input)
      : await createCustomExerciseAction(input);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push(`/exercises/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormError message={serverError} />

      <TextField
        label="Nome do exercício"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="URL da mídia (opcional)"
        type="url"
        placeholder="https://…"
        error={errors.mediaUrl?.message}
        {...register("mediaUrl")}
      />

      <div>
        <label
          htmlFor="difficulty"
          className="block text-sm font-medium text-foreground"
        >
          Dificuldade
        </label>
        <select
          id="difficulty"
          className={inputClass}
          {...register("difficulty")}
        >
          {difficultySchema.options.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d] ?? d}
            </option>
          ))}
        </select>
        {errors.difficulty ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.difficulty.message}
          </p>
        ) : null}
      </div>

      <CheckboxGrid
        legend="Grupos musculares"
        name="muscleGroups"
        options={muscleGroupSchema.options}
        labels={MUSCLE_GROUP_LABELS}
        register={register}
        error={errors.muscleGroups?.message}
      />
      <CheckboxGrid
        legend="Equipamentos"
        name="equipment"
        options={equipmentSchema.options}
        labels={EQUIPMENT_LABELS}
        register={register}
        error={errors.equipment?.message}
      />

      <StringListEditor
        legend="Execução"
        addLabel="+ Adicionar dica"
        name="cues"
        items={cues}
        register={register}
        setValue={setValue}
        error={errors.cues?.message}
      />
      <StringListEditor
        legend="Erros comuns"
        addLabel="+ Adicionar erro"
        name="mistakes"
        items={mistakes}
        register={register}
        setValue={setValue}
        error={errors.mistakes?.message}
      />

      <CheckboxGrid
        legend="Contraindicações"
        name="contraindicationCodes"
        options={contraindicationTags.map((t) => t.code)}
        labels={Object.fromEntries(
          contraindicationTags.map((t) => [t.code, t.label]),
        )}
        register={register}
        error={errors.contraindicationCodes?.message}
      />

      <SubmitButton
        pending={isSubmitting}
        pendingLabel={isEdit ? "Salvando…" : "Criando…"}
      >
        {isEdit ? "Salvar alterações" : "Criar exercício"}
      </SubmitButton>
    </form>
  );
}
