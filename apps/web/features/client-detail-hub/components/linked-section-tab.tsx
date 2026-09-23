import Link from "next/link";

export function LinkedSectionTab({
  linkId,
  sectionName,
  href,
}: {
  linkId: string;
  sectionName: string;
  href: string;
}) {
  return (
    <div className="space-y-4 text-center py-8">
      <p className="text-sm text-muted-foreground">
        Veja os detalhes de {sectionName} em uma página dedicada.
      </p>
      <Link
        href={href}
        className="inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-fast hover:opacity-90"
      >
        Abrir {sectionName}
      </Link>
    </div>
  );
}
