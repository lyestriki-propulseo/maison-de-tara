import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Plus,
  Settings,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react'
import './admin-preview.css'

type Variant = 'calm' | 'notebook' | 'editorial'

type Session = {
  id: string
  day: string
  date: string
  time: string
  endTime: string
  reserved: number
  capacity: number
}

const VARIANTS: Array<{ id: Variant; letter: string; name: string; note: string }> = [
  {
    id: 'calm',
    letter: 'A',
    name: 'Atelier calme',
    note: 'Sobre, lumineux, immédiatement lisible',
  },
  {
    id: 'notebook',
    letter: 'B',
    name: "Carnet d'atelier",
    note: 'Chaleureux, tactile, plus artisanal',
  },
  {
    id: 'editorial',
    letter: 'C',
    name: 'Maison éditoriale',
    note: 'Premium, affirmé, très identitaire',
  },
]

const DAYS = [
  { short: 'Lun', number: '6' },
  { short: 'Mar', number: '7' },
  { short: 'Mer', number: '8' },
  { short: 'Jeu', number: '9' },
  { short: 'Ven', number: '10' },
  { short: 'Sam', number: '11' },
  { short: 'Dim', number: '12' },
]

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const SESSIONS: Array<Session> = [
  { id: 'lun-09', day: 'Lun', date: 'Lundi 6 juillet 2026', time: '09:00', endTime: '11:00', reserved: 8, capacity: 10 },
  { id: 'mer-10', day: 'Mer', date: 'Mercredi 8 juillet 2026', time: '10:00', endTime: '12:00', reserved: 6, capacity: 10 },
  { id: 'ven-10', day: 'Ven', date: 'Vendredi 10 juillet 2026', time: '10:00', endTime: '12:00', reserved: 10, capacity: 10 },
  { id: 'sam-11', day: 'Sam', date: 'Samedi 11 juillet 2026', time: '11:00', endTime: '13:00', reserved: 4, capacity: 10 },
  { id: 'mar-14', day: 'Mar', date: 'Mardi 7 juillet 2026', time: '14:00', endTime: '16:00', reserved: 7, capacity: 10 },
  { id: 'jeu-14', day: 'Jeu', date: 'Jeudi 9 juillet 2026', time: '14:00', endTime: '16:00', reserved: 5, capacity: 10 },
  { id: 'mer-16', day: 'Mer', date: 'Mercredi 8 juillet 2026', time: '16:00', endTime: '18:00', reserved: 3, capacity: 10 },
  { id: 'sam-16', day: 'Sam', date: 'Samedi 11 juillet 2026', time: '16:00', endTime: '18:00', reserved: 8, capacity: 10 },
]

const PARTICIPANTS = ['Camille Leroux', 'Élise Garnier', 'Marine Aubert', 'Sophie Marchand', 'Claire Dubois']

export function AdminDesignPreview() {
  const [variant, setVariant] = useState<Variant>('calm')
  const [selectedId, setSelectedId] = useState('jeu-14')
  const [notice, setNotice] = useState('')
  const selected = SESSIONS.find((session) => session.id === selectedId) ?? SESSIONS[0]!
  const variantInfo = VARIANTS.find((item) => item.id === variant) ?? VARIANTS[0]!

  function simulate(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <main className="preview-studio">
      <header className="preview-studio__bar">
        <div>
          <p className="preview-studio__eyebrow">Maison de Tara · étude du back-office</p>
          <h1>Choisissez une direction</h1>
        </div>

        <div className="preview-switcher" aria-label="Variantes de design">
          {VARIANTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={variant === item.id ? 'is-active' : ''}
              onClick={() => setVariant(item.id)}
              aria-pressed={variant === item.id}
            >
              <span>{item.letter}</span>
              <strong>{item.name}</strong>
            </button>
          ))}
        </div>

        <div className="preview-studio__meta">
          <span>{variantInfo.note}</span>
          <Link to="/admin/agenda">Retour à l’admin actuel</Link>
        </div>
      </header>

      <div className="preview-viewport" aria-live="polite">
        <section className={`tara-admin tara-admin--${variant}`} aria-label={`Preview ${variantInfo.name}`}>
          <PreviewSidebar variant={variant} />

          <div className="tara-admin__main">
            {variant === 'notebook' ? <div className="tara-admin__motif" aria-hidden="true" /> : null}

            <AgendaHeader variant={variant} onAdd={() => simulate('Ouverture du formulaire de réservation')} />

            <div className="tara-admin__content">
              <CalendarPanel
                variant={variant}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <SessionPanel session={selected} onAction={simulate} />
            </div>
          </div>

          {notice ? <div className="tara-admin__toast" role="status">{notice}</div> : null}
        </section>
      </div>
    </main>
  )
}

function PreviewSidebar({ variant }: { variant: Variant }) {
  return (
    <aside className="tara-sidebar">
      <div className="tara-sidebar__brand">
        <span className="tara-sidebar__mark" aria-hidden="true">T</span>
        <div>
          <strong>Maison de Tara</strong>
          <small>Espace de gestion</small>
        </div>
      </div>

      <nav aria-label="Navigation de la preview">
        <button type="button"><Home size={17} /> Accueil</button>
        <button type="button" className="is-active"><CalendarDays size={17} /> Agenda</button>
        <button type="button"><Users size={17} /> Réservations</button>
        <button type="button"><Settings size={17} /> Paramètres</button>
      </nav>

      <div className="tara-sidebar__profile">
        <span>MT</span>
        <div>
          <strong>Maison de Tara</strong>
          <small>Administratrice</small>
        </div>
      </div>

      {variant === 'notebook' ? <p className="tara-sidebar__aside-note">Prendre le temps.</p> : null}
    </aside>
  )
}

function AgendaHeader({ variant, onAdd }: { variant: Variant; onAdd: () => void }) {
  return (
    <header className="tara-heading">
      <div>
        <p className="tara-heading__eyebrow">Atelier · planning</p>
        {variant === 'editorial' ? (
          <h1><span>Juillet</span> <em>2026</em></h1>
        ) : (
          <h1>Agenda</h1>
        )}
        <p className="tara-heading__intro">
          Pilotez les créneaux, les places disponibles et les réservations de l’atelier.
        </p>
      </div>

      <button type="button" className="tara-button tara-button--primary" onClick={onAdd}>
        <Plus size={16} /> Ajouter une réservation
      </button>
    </header>
  )
}

function CalendarPanel({
  variant,
  selectedId,
  onSelect,
}: {
  variant: Variant
  selectedId: string
  onSelect: (id: string) => void
}) {
  const sessionLookup = useMemo(
    () => new Map(SESSIONS.map((session) => [`${session.day}-${session.time}`, session])),
    [],
  )

  return (
    <section className="tara-calendar" aria-label="Semaine du 6 au 12 juillet 2026">
      <div className="tara-calendar__toolbar">
        <div>
          <button type="button" aria-label="Semaine précédente"><ChevronLeft size={18} /></button>
          <h2>Juillet 2026</h2>
          <button type="button" aria-label="Semaine suivante"><ChevronRight size={18} /></button>
        </div>
        <button type="button" className="tara-today">Aujourd’hui</button>
      </div>

      <div className="tara-calendar__grid">
        <div className="tara-calendar__corner" />
        {DAYS.map((day) => (
          <div className="tara-calendar__day" key={day.short}>
            <span>{day.short}</span>
            <strong>{day.number}</strong>
          </div>
        ))}

        {TIMES.flatMap((time) => [
          <div className="tara-calendar__time" key={`time-${time}`}>{time}</div>,
          ...DAYS.map((day) => {
            const session = sessionLookup.get(`${day.short}-${time}`)
            return (
              <div className="tara-calendar__cell" key={`${day.short}-${time}`}>
                {session ? (
                  <button
                    type="button"
                    className={`${session.id === selectedId ? 'is-selected' : ''} ${session.reserved === session.capacity ? 'is-full' : ''}`}
                    onClick={() => onSelect(session.id)}
                    aria-label={`${session.date}, ${session.time}, ${session.reserved} réservations sur ${session.capacity}`}
                    aria-pressed={session.id === selectedId}
                  >
                    <strong>{session.reserved}/{session.capacity}</strong>
                    {variant !== 'editorial' ? <span>{session.capacity - session.reserved} libres</span> : null}
                  </button>
                ) : null}
              </div>
            )
          }),
        ])}
      </div>

      <footer className="tara-calendar__legend">
        <span><i className="is-open" /> Disponible</span>
        <span><i className="is-busy" /> Presque complet</span>
        <span><i className="is-full" /> Complet</span>
      </footer>
    </section>
  )
}

function SessionPanel({ session, onAction }: { session: Session; onAction: (message: string) => void }) {
  const names = PARTICIPANTS.slice(0, session.reserved > 5 ? 5 : session.reserved)

  return (
    <aside className="tara-session">
      <div className="tara-session__heading">
        <p>Créneau sélectionné</p>
        <h2>{session.date}</h2>
        <div className="tara-session__time"><Clock3 size={17} /> {session.time} à {session.endTime}</div>
      </div>

      <div className="tara-session__capacity">
        <span>Capacité</span>
        <strong>{session.reserved} <small>/ {session.capacity}</small></strong>
        <p>{Math.max(session.capacity - session.reserved, 0)} places encore disponibles</p>
      </div>

      <div className="tara-session__actions">
        <button type="button" onClick={() => onAction('Créneau bloqué dans la simulation')}>
          <Ban size={15} /> Bloquer le créneau
        </button>
        <button type="button" onClick={() => onAction('Réglage de capacité ouvert')}>
          <SlidersHorizontal size={15} /> Modifier la capacité
        </button>
      </div>

      <section className="tara-session__people">
        <div>
          <h3>Participants</h3>
          <span>{session.reserved} inscrits</span>
        </div>
        <ul>
          {names.map((name) => (
            <li key={name}><UserRound size={15} /> {name}</li>
          ))}
        </ul>
        {session.reserved > names.length ? <button type="button">Voir les {session.reserved} participants</button> : null}
      </section>
    </aside>
  )
}
