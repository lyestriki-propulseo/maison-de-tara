import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AgendaManager } from '@/components/admin/AgendaManager'

const invalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
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

    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /samedi 18 juillet.*2 réservations sur 12/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByText('2/12 places')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquer' })).toBeInTheDocument()
  })

  test('bascule vers l’éditeur de grille sans ouvrir de modale', () => {
    render(<AgendaManager data={agendaData} />)

    fireEvent.click(screen.getByRole('button', { name: 'Définir la grille' }))

    expect(screen.getByRole('heading', { name: 'Grille hebdomadaire' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Samedi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer et générer' })).toBeInTheDocument()
  })
})
