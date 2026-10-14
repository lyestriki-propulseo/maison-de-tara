import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ContentImageField } from '@/components/admin/ContentImageField'

type Props = Parameters<typeof ContentImageField>[0]

function renderField(overrides: Partial<Props> = {}) {
  const props: Props = {
    label: 'Photo principale',
    currentImagePath: 'https://example.com/photo.jpg',
    currentCaption: 'La boutique',
    currentFocusX: 50,
    currentFocusY: 50,
    currentZoom: 1,
    format: { ratio: 0.741, arch: true },
    pending: false,
    onSave: vi.fn().mockResolvedValue(true),
    onSaveFocus: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  render(<ContentImageField {...props} />)
  return props
}

const zoomSlider = () => screen.getByRole('slider', { name: /Zoom/ })

/** Photo 2:1 « chargée » (jsdom ne charge aucune image) : dans l'arche 0,741, entière à 37 %. */
class WideImage {
  naturalWidth = 2000
  naturalHeight = 1000
  crossOrigin = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

describe('ContentImageField', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('permet d’ajuster le point de focus d’une photo existante', async () => {
    const props = renderField()

    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    fireEvent.change(screen.getByLabelText('Position horizontale'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Position verticale'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le cadrage' }))

    await waitFor(() =>
      expect(props.onSaveFocus).toHaveBeenCalledWith('La boutique', {
        x: 25,
        y: 70,
        zoom: 1,
        fill: '#fbf7ec',
      }),
    )
    expect(screen.getByRole('button', { name: 'Ajuster le cadrage' })).toBeInTheDocument()
  })

  test('recentre la photo à 50 % sur les deux axes', () => {
    renderField({ currentFocusX: 15, currentFocusY: 80 })

    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recentrer' }))

    expect(screen.getByLabelText('Position horizontale')).toHaveValue('50')
    expect(screen.getByLabelText('Position verticale')).toHaveValue('50')
  })

  test('CA-01 — l’aperçu a la forme de l’emplacement (rapport et arche)', () => {
    renderField({ format: { ratio: 0.741, arch: true } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    const preview = screen.getByRole('img', { name: 'Aperçu du cadrage' })
    expect(preview.style.aspectRatio).toBe('0.741 / 1')
    expect(preview.style.borderRadius).toBe('999px 999px 0 0')
  })

  test('CA-02 — zoom par les boutons − / + et le curseur, sans renvoyer le fichier', async () => {
    const props = renderField()
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))

    expect(screen.getByRole('button', { name: 'Dézoomer' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    expect(zoomSlider()).toHaveValue('120')
    fireEvent.change(zoomSlider(), { target: { value: '300' } })
    expect(screen.getByRole('button', { name: 'Zoomer' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Dézoomer' }))
    expect(screen.getByText('290 %')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le cadrage' }))
    await waitFor(() =>
      expect(props.onSaveFocus).toHaveBeenCalledWith('La boutique', {
        x: 50,
        y: 50,
        zoom: 2.9,
        fill: '#fbf7ec',
      }),
    )
    expect(props.onSave).not.toHaveBeenCalled()
  })

  test('CA-03 — une nouvelle photo repart de 100 %, avec les mêmes réglages de zoom', () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:photo', revokeObjectURL: vi.fn() })
    renderField({ currentZoom: 2.4, currentFocusX: 10 })

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Changer la photo'), { target: { files: [file] } })

    expect(zoomSlider()).toHaveValue('100')
    expect(screen.getByLabelText('Position horizontale')).toHaveValue('50')
    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    expect(zoomSlider()).toHaveValue('110')
  })

  test('CA-07 — rouvrir le cadrage retrouve le zoom et la position enregistrés', () => {
    renderField({ currentZoom: 1.8, currentFocusX: 30, currentFocusY: 64 })
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))

    expect(zoomSlider()).toHaveValue('180')
    expect(screen.getByText('180 %')).toBeInTheDocument()
    expect(screen.getByLabelText('Position horizontale')).toHaveValue('30')
    expect(screen.getByLabelText('Position verticale')).toHaveValue('64')
  })
  test('CA-02 v2 — tant que la photo n’est pas chargée, pas de dézoom sous 100 %', () => {
    renderField()
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    expect(screen.getByRole('button', { name: 'Dézoomer' })).toBeDisabled()
    expect(zoomSlider()).toHaveAttribute('min', '100')
  })

  test('CA-02 v2 — dézoomer jusqu’à « Photo entière », enregistré comme un mode (0)', async () => {
    vi.stubGlobal('Image', WideImage)
    const props = renderField()
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    await waitFor(() => expect(zoomSlider()).toHaveAttribute('min', '37'))

    fireEvent.click(screen.getByRole('button', { name: 'Dézoomer' }))
    expect(screen.getByText('90 %')).toBeInTheDocument()
    // Le curseur tout à gauche = mode « Photo entière ».
    fireEvent.change(zoomSlider(), { target: { value: '37' } })
    expect(screen.getByText('Photo entière')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dézoomer' })).toBeDisabled()
    // CA-05 : sous 100 %, l'aperçu montre la couleur de remplissage dans la bande.
    expect(screen.getByRole('img', { name: 'Aperçu du cadrage' }).style.backgroundColor).toBe(
      'rgb(251, 247, 236)',
    )
    fireEvent.change(screen.getByLabelText('Position verticale'), { target: { value: '100' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le cadrage' }))
    await waitFor(() =>
      expect(props.onSaveFocus).toHaveBeenCalledWith('La boutique', {
        x: 50,
        y: 100,
        zoom: 0,
        fill: '#fbf7ec',
      }),
    )
  })

  test('CA-02 v2 — depuis « Photo entière », + repart du zoom réellement affiché', async () => {
    vi.stubGlobal('Image', WideImage)
    renderField({ currentZoom: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    await waitFor(() => expect(zoomSlider()).toHaveAttribute('min', '37'))
    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    expect(screen.getByText('47 %')).toBeInTheDocument()
  })

  test('CA-07 v2 — rouvrir un cadrage enregistré en « Photo entière » le retrouve', async () => {
    vi.stubGlobal('Image', WideImage)
    renderField({ currentZoom: 0, currentFocusY: 100 })
    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    expect(screen.getByText('Photo entière')).toBeInTheDocument()
    await waitFor(() => expect(zoomSlider()).toHaveValue('37'))
    expect(screen.getByLabelText('Position verticale')).toHaveValue('100')
  })
})
