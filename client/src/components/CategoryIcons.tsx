export const categories: { id: string; label: string; image: string }[] = [
  { id: 'for_you', label: 'Pour toi', image: '' },
  { id: 'following', label: 'Suivis', image: '' },
  { id: 'fashion_w', label: 'Mode femme', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&h=200&fit=crop&q=80' },
  { id: 'fashion_m', label: 'Mode homme', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop&q=80' },
  { id: 'sneakers', label: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop&q=80' },
  { id: 'bags', label: 'Sacs', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop&q=80' },
  { id: 'jewelry', label: 'Bijoux', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&h=200&fit=crop&q=80' },
  { id: 'watches', label: 'Montres', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop&q=80' },
  { id: 'beauty', label: 'Beaute', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop&q=80' },
  { id: 'electronics', label: 'High-tech', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200&h=200&fit=crop&q=80' },
  { id: 'gaming', label: 'Gaming', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop&q=80' },
  { id: 'cards', label: 'Cartes', image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=200&h=200&fit=crop&q=80' },
  { id: 'toys', label: 'Jouets', image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop&q=80' },
  { id: 'vintage', label: 'Vintage', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop&q=80' },
  { id: 'art', label: 'Art', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200&h=200&fit=crop&q=80' },
  { id: 'furniture', label: 'Meubles', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop&q=80' },
  { id: 'home', label: 'Maison', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=200&fit=crop&q=80' },
  { id: 'sports', label: 'Sport', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop&q=80' },
  { id: 'fitness', label: 'Fitness', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&q=80' },
  { id: 'music', label: 'Musique', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop&q=80' },
  { id: 'books', label: 'Livres', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=200&fit=crop&q=80' },
  { id: 'kids', label: 'Enfants', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop&q=80' },
  { id: 'pets', label: 'Animaux', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop&q=80' },
  { id: 'auto', label: 'Auto-Moto', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop&q=80' },
  { id: 'garden', label: 'Jardin', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&q=80' },
  { id: 'food', label: 'Food', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop&q=80' },
  { id: 'handmade', label: 'Fait main', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=200&h=200&fit=crop&q=80' },
  { id: 'collect', label: 'Collection', image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=200&h=200&fit=crop&q=80' },
  { id: 'photo', label: 'Photo', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop&q=80' },
  { id: 'tools', label: 'Bricolage', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop&q=80' },
]

import { useState } from 'react'
import CartoonAvatar from './CartoonAvatar'

// "Suivis" icon — two connected people
function FollowingIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="follow-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Person back */}
      <circle cx="50" cy="24" r="11" fill="url(#follow-grad)" opacity="0.5" />
      <path d="M28 62c0-12.15 9.85-22 22-22s22 9.85 22 22" fill="url(#follow-grad)" opacity="0.5" />
      {/* Person front */}
      <circle cx="32" cy="28" r="12" fill="url(#follow-grad)" />
      <path d="M8 66c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="url(#follow-grad)" />
      {/* Heart link */}
      <path d="M62.5 37.5l3.2-2.8a3.5 3.5 0 015 0 3.5 3.5 0 010 5L62.5 47l-8.2-7.3a3.5 3.5 0 010-5 3.5 3.5 0 015 0l3.2 2.8z" fill="#F0908A" />
    </svg>
  )
}

import { t } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n'

interface CategoryScrollProps {
  selected: string
  onSelect: (id: string) => void
  lang?: string
}

export function CategoryScroll({ selected, onSelect, lang = 'en' }: CategoryScrollProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  return (
    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '8px 0 8px 16px', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
      {categories.map(cat => {
        const isActive = selected === cat.id
        const imageFailed = failedImages.has(cat.id)

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '120px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: '116px', height: '116px', borderRadius: '10px', overflow: 'hidden', position: 'relative',
              border: isActive ? '2.5px solid #F0908A' : '1.5px solid #2A2A2A',
              backgroundColor: '#1C1C1E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isActive ? '0 0 12px rgba(240,144,138,0.25)' : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              ...(imageFailed ? { background: 'linear-gradient(135deg, #F0908A 0%, #E8344E 100%)' } : {})
            }}>
              {cat.id === 'for_you' ? (
                <CartoonAvatar seed="shapop_pour_toi" size={116} />
              ) : cat.id === 'following' ? (
                <FollowingIcon size={72} />
              ) : imageFailed ? (
                <span style={{
                  fontSize: '30px', fontWeight: 800, color: '#fff',
                  fontStyle: 'italic', textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  fontFamily: 'Georgia, serif',
                }}>
                  {cat.label.charAt(0).toUpperCase()}
                </span>
              ) : (
                <img
                  src={cat.image}
                  alt={cat.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                  onError={() => { setFailedImages(prev => new Set(prev).add(cat.id)) }}
                />
              )}
              {/* Label overlay on image — WhatNot style */}
              {(cat.image || imageFailed) && cat.id !== 'for_you' && cat.id !== 'following' && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  padding: '16px 6px 6px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 700, color: '#fff',
                    textAlign: 'center', lineHeight: 1.1,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}>
                    {t(lang, cat.id as TranslationKey)}
                  </span>
                </div>
              )}
            </div>
            {/* Label below only for special tabs (Pour toi, Suivis) */}
            {(cat.id === 'for_you' || cat.id === 'following') && (
              <span style={{
                fontSize: '12px', fontWeight: isActive ? 700 : 600,
                color: isActive ? '#fff' : '#999',
                marginTop: '6px', textAlign: 'center', lineHeight: 1.2,
                maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {t(lang, cat.id as TranslationKey)}
              </span>
            )}
          </button>
        )
      })}
      {/* Spacer to ensure right padding in scrollable container (padding-right is ignored by WebKit on scroll containers) */}
      <div style={{ flexShrink: 0, width: '16px', minWidth: '16px' }} aria-hidden="true" />
    </div>
  )
}
