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

const agendaData = {
  sessions: [
    {
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
    },
  ],
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
    render(<AgendaManager data={agendaData} />)

    expect(screen.getByRole('heading', { name: 'Planning de l’atelier' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /samedi 18 juillet.*2 réservations sur 12/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByText('2/12 places')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquer' })).toBeInTheDocument()
  })

  test('affiche les onglets de la rubrique Réservations, sans la grille', () => {
    render(<AgendaManager data={agendaData} />)

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
    expect(screen.getByDisplayValue('Samedi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et générer' }))
    expect(onSave).toHaveBeenCalledWith([
      { weekday: 6, startTime: '14:00', durationMinutes: 120, capacity: 12 },
    ])
  })
})
