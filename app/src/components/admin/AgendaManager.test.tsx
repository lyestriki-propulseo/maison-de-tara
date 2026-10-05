import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AgendaManager } from '@/components/admin/AgendaManager'
import { ScheduleGridEditor } from '@/components/admin/ScheduleGridEditor'

const invalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/admin-data', () => ({
  createManualReservation: vi.fn(),
  saveScheduleGrid: vi.fn(),
  setSessionBlocked: vi.fn(),
  updateSessionCapacity: vi.fn(),
}))

const baseSession = {
  id: '59f7069f-82e7-44df-a907-c2d22bc6062f',
  date: '2026-07-18',
  time: '14:00:00',
  durationMinutes: 120,
  capacity: 12,
  status: 'open' as const,
  note: null,
  reserved: 2,
  reservations: [
    {
      id: 'f84754c9-e818-44f9-a756-776708e85d9e',
      customerName: 'Camille Martin',
      customerEmail: 'camille@example.com',
      customerPhone: '06 12 34 56 78',
      partySize: 2,
      status: 'confirmed' as const,
      source: 'manual' as const,
      notes: null,
    },
  ],
}

const agendaData = {
  sessions: [baseSession],
  templates: [
    {
      id: '30de4593-e347-490d-9322-b4ebad0ed960',
      weekday: 6,
      startTime: '14:00',
      durationMinutes: 120,
      capacity: 12,
    },
  ],
}

describe('AgendaManager', () => {
  beforeEach(() => invalidate.mockReset())

  test('affiche le détail du créneau sélectionné et ses réservations', () => {
    render(<AgendaManager data={agendaData} today="2026-07-13" />)

    expect(screen.getByRole('heading', { name: 'Planning de l’atelier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /samedi 18 juillet.*2 réservations sur 12/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByText('2/12 places')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquer' })).toBeInTheDocument()
  })

  const dataOn = (date: string) => ({
    ...agendaData,
    sessions: [{ ...baseSession, date }],
  })

  test('ouvre sur la semaine en cours avec une plage de dates', () => {
    render(<AgendaManager data={dataOn('2026-10-08')} today="2026-10-04" />)
    expect(screen.getByRole('heading', { level: 2, name: /sept\./ })).toHaveTextContent(
      '28 sept. – 4 oct. 2026',
    )
  })

  test('même mois : le mois n’est écrit qu’une fois', () => {
    render(<AgendaManager data={dataOn('2026-10-08')} today="2026-10-05" />)
    expect(screen.getByRole('heading', { level: 2, name: /oct\./ })).toHaveTextContent(
      '5 – 11 oct. 2026',
    )
  })

  test('semaine à cheval sur deux années', () => {
    render(<AgendaManager data={dataOn('2026-12-30')} today="2026-12-30" />)
    expect(screen.getByRole('heading', { level: 2, name: /déc\./ })).toHaveTextContent(
      '28 déc. 2026 – 3 janv. 2027',
    )
  })

  test('désactive « Semaine précédente » sur la semaine en cours', () => {
    render(<AgendaManager data={dataOn('2026-10-08')} today="2026-10-05" />)
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }))
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeEnabled()
  })

  test('marque les jours passés de la semaine', () => {
    render(<AgendaManager data={dataOn('2026-10-08')} today="2026-10-07" />)
    expect(screen.getByText("lun").closest('[data-past]')).not.toBeNull()
    expect(screen.getByText("jeu").closest('[data-past]')).toBeNull()
  })

  test('sélectionne par défaut un créneau de la semaine en cours', () => {
    const data = {
      ...agendaData,
      sessions: [
        { ...baseSession, id: 'old', date: '2026-09-01', reservations: [] },
        { ...baseSession, id: 'now', date: '2026-10-08' },
      ],
    }
    render(<AgendaManager data={data} today="2026-10-05" />)
    expect(screen.getByText('Camille Martin')).toBeInTheDocument()
  })

  test('affiche les onglets de la rubrique Réservations, sans la grille', () => {
    render(<AgendaManager data={agendaData} today="2026-07-13" />)

    const tabs = screen.getByRole('navigation', { name: 'Rubrique Réservations' })
    for (const [label, href] of [
      ['Planning', '/admin/agenda'],
      ['Événements', '/admin/programme'],
      ['Réservations', '/admin/reservations'],
      ['Réglages', '/admin/reglages'],
    ]) {
      expect(within(tabs).getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
    expect(screen.queryByRole('heading', { name: 'Grille hebdomadaire' })).not.toBeInTheDocument()
  })
})

describe('ScheduleGridEditor', () => {
  test('affiche la grille existante et enregistre les horaires', () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScheduleGridEditor templates={agendaData.templates} pending={false} onSave={onSave} />)

    expect(screen.getByRole('heading', { name: 'Grille hebdomadaire' })).toBeInTheDocument()
    const samedi = screen.getByRole('group', { name: 'Samedi' })
    expect(within(samedi).getByDisplayValue('14:00')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Lundi' })).getByText('Fermé')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et générer' }))
    expect(onSave).toHaveBeenCalledWith(
      [{ weekday: 6, startTime: '14:00', durationMinutes: 120, capacity: 12 }],
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    )
  })

  test('ajoute un horaire sur la ligne du jour', () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScheduleGridEditor templates={agendaData.templates} pending={false} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un horaire le lundi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et générer' }))
    expect(onSave.mock.calls[0]?.[0]).toContainEqual({
      weekday: 1,
      startTime: '10:00',
      durationMinutes: 120,
      capacity: 25,
    })
  })

  test('copie les horaires d’un jour vers d’autres jours', () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScheduleGridEditor templates={agendaData.templates} pending={false} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copier les horaires du samedi' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dimanche' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copier vers 1 jour' }))
    expect(within(screen.getByRole('group', { name: 'Dimanche' })).getByDisplayValue('14:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et générer' }))
    expect(onSave.mock.calls[0]?.[0]).toContainEqual({
      weekday: 0,
      startTime: '14:00',
      durationMinutes: 120,
      capacity: 12,
    })
  })
})
