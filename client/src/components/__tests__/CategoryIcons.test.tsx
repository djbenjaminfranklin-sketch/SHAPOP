import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryScroll, categories } from '../CategoryIcons'

describe('CategoryIcons', () => {
  describe('categories data', () => {
    it('exports a non-empty array of categories', () => {
      expect(categories.length).toBeGreaterThan(0)
    })

    it('each category has id, label, and image properties', () => {
      for (const cat of categories) {
        expect(cat).toHaveProperty('id')
        expect(cat).toHaveProperty('label')
        expect(cat).toHaveProperty('image')
        expect(typeof cat.id).toBe('string')
        expect(typeof cat.label).toBe('string')
        expect(typeof cat.image).toBe('string')
      }
    })

    it('has unique category ids', () => {
      const ids = categories.map(c => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('includes key categories like for_you, following, fashion_w', () => {
      const ids = categories.map(c => c.id)
      expect(ids).toContain('for_you')
      expect(ids).toContain('following')
      expect(ids).toContain('fashion_w')
      expect(ids).toContain('sneakers')
    })
  })

  describe('CategoryScroll component', () => {
    it('renders all category buttons', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="en" />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(categories.length)
    })

    it('calls onSelect when a category is clicked', () => {
      const onSelect = vi.fn()
      render(<CategoryScroll selected="for_you" onSelect={onSelect} lang="en" />)
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[2]) // third category (fashion_w)
      expect(onSelect).toHaveBeenCalledWith('fashion_w')
    })

    it('renders translated labels in English', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="en" />)
      expect(screen.getByText('For you')).toBeInTheDocument()
      expect(screen.getByText('Following')).toBeInTheDocument()
      expect(screen.getByText('Women')).toBeInTheDocument()
    })

    it('renders translated labels in French', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="fr" />)
      expect(screen.getByText('Pour toi')).toBeInTheDocument()
      expect(screen.getByText('Suivis')).toBeInTheDocument()
      expect(screen.getByText('Femme')).toBeInTheDocument()
    })

    it('renders translated labels in Spanish', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="es" />)
      expect(screen.getByText('Para ti')).toBeInTheDocument()
      expect(screen.getByText('Seguidos')).toBeInTheDocument()
      expect(screen.getByText('Mujer')).toBeInTheDocument()
    })

    it('shows fallback initial when an image fails to load', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="en" />)

      // Get the sneakers image (index 4, after for_you and following which don't have images)
      const images = screen.getAllByRole('img')
      // Simulate image load error on the first real image (fashion_w)
      fireEvent.error(images[0])

      // After error, the fallback initial "M" (for "Mode femme" label) should render
      // Actually the label text comes from the categories array, fashion_w label is "Mode femme"
      // The fallback displays cat.label.charAt(0).toUpperCase() which is "M"
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('fallback initial uses first character of label (XSS-safe textContent)', () => {
      render(<CategoryScroll selected="for_you" onSelect={() => {}} lang="en" />)
      const images = screen.getAllByRole('img')

      // Trigger error on multiple images to verify different initials
      fireEvent.error(images[0]) // fashion_w -> "Mode femme" -> "M"
      fireEvent.error(images[1]) // fashion_m -> "Mode homme" -> "M"
      fireEvent.error(images[2]) // sneakers -> "Sneakers" -> "S"

      // Verify the "S" initial for sneakers
      expect(screen.getByText('S')).toBeInTheDocument()
    })
  })
})
