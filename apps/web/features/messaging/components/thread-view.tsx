"use client";

// PRD 11 §5.2/§5.4/§7 — the actual chat thread: a scrollable message list
// (plain JSX text nodes only — React escapes everything by default, so a
// message body containing "<b>"/"<script>" renders as literal visible text,
// never parsed markup; this component must never reach for
// dangerouslySetInnerHTML) plus a composer, mobile-first and usable
// one-handed. Disabled (no composer at all) once the thread is READ_ONLY —
// history stays visible, per §5.3.
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction } from "../actions";
import type { PublicMessage, PublicThread } from "../api-client";

// This component is server-rendered once (SSR) and then hydrated on the
// client — `toLocaleString()` with no explicit timeZone resolves against
// whatever timezone the *runtime* defaults to, which differs between the
// Node server (typically UTC in this Docker setup) and the browser (the
// viewer's local timezone). That mismatch is a real, reproducible React
// hydration error ("Text content does not match server-rendered HTML").
// Pinning an explicit timeZone makes the server and client render the
// identical string, matching this app's Brazil-focused pt-BR convention.
function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function Composer({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const action = sendMessageAction.bind(null, threadId);
  // <form action> requires a void-returning function — the native
  // (pre-hydration) fallback path doesn't read the result anyway, since
  // there's no React state to update without JS.
  async function nativeFallbackAction(formData: FormData): Promise<void> {
    await action(formData);
  }

  // The <form>'s `action` attribute is bound directly to the server action,
  // so a submission works via genuine browser-native form semantics even if
  // React hasn't finished hydrating yet (Next.js progressively enhances
  // this) — a real, reproducible bug this codebase hit: a plain onClick
  // handler calling a "use server" function requires hydration to have
  // already attached the listener, and under load a click landing just
  // before that finished was silently dropped (no request fired at all).
  // onSubmit's preventDefault takes over once JS *has* hydrated, giving the
  // pending/error UI feedback below — but the native fallback is what
  // makes this correct regardless of timing.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível enviar a mensagem.");
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div>
      <form action={nativeFallbackAction} onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={2}
          placeholder="Escreva uma mensagem..."
          aria-label="Mensagem"
          className="min-h-11 flex-1 rounded-md border border-border bg-background p-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function ThreadView({
  thread,
  messages,
  viewerId,
}: {
  thread: PublicThread;
  messages: PublicMessage[];
  viewerId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Nenhuma mensagem ainda — envie a primeira.
          </li>
        ) : null}
        {messages.map((message) => {
          const isMine = message.senderId === viewerId;
          return (
            <li
              key={message.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                isMine
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-card text-foreground"
              }`}
            >
              {/* Plain text node — React escapes this; no HTML is ever
                  interpreted from a message body (§5.4). */}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">{formatSentAt(message.sentAt)}</p>
            </li>
          );
        })}
      </ul>

      {thread.status === "READ_ONLY" ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground"
        >
          Este vínculo foi encerrado — a conversa ficou disponível apenas para
          leitura, sem novas mensagens.
        </p>
      ) : (
        <Composer threadId={thread.id} />
      )}
    </div>
  );
}
