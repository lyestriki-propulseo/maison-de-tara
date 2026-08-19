import { useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { listContentBlocks, updateContentImage, updateContentText } from '@/lib/content-data'
import { CONTENT_PAGES, contentPageLabel } from '@/lib/content'
import { ContentImageField } from '@/components/admin/ContentImageField'

export const Route = createFileRoute('/admin/contenu')({
  loader: () => listContentBlocks(),
  component: ContenuPage,
})

type ContentRow = Awaited<ReturnType<typeof listContentBlocks>>[number]

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue'
}

function ContenuPage() {
  const router = useRouter()
  const blocks = Route.useLoaderData()
  const [page, setPage] = useState<string>('accueil')
  const [pending, setPending] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string }>()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const sections = useMemo(() => {
    const rows = blocks.filter((b) => b.page === page)
    const bySection = new Map<string, ContentRow[]>()
    for (const row of rows) {
      const list = bySection.get(row.section) ?? []
      list.push(row)
      bySection.set(row.section, list)
    }
    return [...bySection.entries()]
  }, [blocks, page])

  async function saveText(row: ContentRow) {
    setPending(row.id)
    setFeedback(undefined)
    try {
      await updateContentText({ data: { id: row.id, textValue: drafts[row.id] ?? row.textValue ?? '' } })
      await router.invalidate()
      setFeedback({ kind: 'success', message: 'Texte enregistré.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setPending(null)
    }
  }

  async function saveImage(row: ContentRow, dataUrl: string, caption: string) {
    setPending(row.id)
    setFeedback(undefined)
    try {
      await updateContentImage({ data: { id: row.id, dataUrl, caption } })
      await router.invalidate()
      setFeedback({ kind: 'success', message: 'Photo enregistrée.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error) })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le site</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Contenu du site</h1>
          <p className="tara-page-intro">Les photos et les textes de chaque page, modifiables directement ici.</p>
        </div>
      </div>

      {feedback ? <Feedback kind={feedback.kind}>{feedback.message}</Feedback> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {CONTENT_PAGES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPage(p.value)}
            className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
              page === p.value ? 'bg-[#4A5D2E] text-white' : 'bg-[#4A5D2E]/8 text-[#31421E] hover:bg-[#4A5D2E]/15'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="mt-8 text-center text-sm text-neutral-600">Rien à afficher pour « {contentPageLabel(page)} » pour l’instant.</p>
      ) : (
        sections.map(([section, rows]) => (
          <section key={section} className="mt-6 rounded-xl border border-[#4A5D2E]/15 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#4A5D2E]">{section}</h2>
            <div className="mt-4 flex flex-col gap-5">
              {rows.map((row) =>
                row.fieldType === 'image' ? (
                  <ContentImageField
                    key={row.id}
                    label={row.label}
                    currentImagePath={row.imagePath}
                    currentCaption={row.imageCaption}
                    pending={pending === row.id}
                    onSave={(dataUrl, caption) => saveImage(row, dataUrl, caption)}
                    onCancel={() => {}}
                  />
                ) : (
                  <label key={row.id} className="block text-xs font-medium text-neutral-600">
                    {row.label}
                    <div className="mt-1 flex gap-2">
                      <textarea
                        className="min-h-16 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-[#1A1815] outline-none focus:border-[#4A5D2E] focus:ring-2 focus:ring-[#4A5D2E]/15"
                        value={drafts[row.id] ?? row.textValue ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        disabled={pending === row.id}
                        onClick={() => saveText(row)}
                        className="min-h-9 self-start rounded-lg bg-[#4A5D2E] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#3B4B24] disabled:opacity-50"
                      >
                        {pending === row.id ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </label>
                ),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function Feedback({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mt-5 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
        kind === 'success' ? 'bg-[#E9F0DF] text-[#31421E]' : 'bg-red-50 text-red-800'
      }`}
    >
      <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
