import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { ContentImageField } from '@/components/admin/ContentImageField'

describe('ContentImageField', () => {
  test('permet d’ajuster le point de focus d’une photo existante', async () => {
    const onSaveFocus = vi.fn().mockResolvedValue(true)

    render(
      <ContentImageField
        label="Photo principale"
        currentImagePath="https://example.com/photo.jpg"
        currentCaption="La boutique"
        currentFocusX={50}
        currentFocusY={50}
        pending={false}
        onSave={vi.fn().mockResolvedValue(true)}
        onSaveFocus={onSaveFocus}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    fireEvent.change(screen.getByLabelText('Position horizontale'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Position verticale'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le cadrage' }))

    await waitFor(() => expect(onSaveFocus).toHaveBeenCalledWith('La boutique', 25, 70))
    expect(screen.getByRole('button', { name: 'Ajuster le cadrage' })).toBeInTheDocument()
  })

  test('recentre la photo à 50 % sur les deux axes', () => {
    render(
      <ContentImageField
        label="Photo principale"
        currentImagePath="https://example.com/photo.jpg"
        currentCaption={null}
        currentFocusX={15}
        currentFocusY={80}
        pending={false}
        onSave={vi.fn().mockResolvedValue(true)}
        onSaveFocus={vi.fn().mockResolvedValue(true)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajuster le cadrage' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recentrer' }))

    expect(screen.getByLabelText('Position horizontale')).toHaveValue('50')
    expect(screen.getByLabelText('Position verticale')).toHaveValue('50')
  })
})
