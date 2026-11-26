import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { tr, type Localized } from '../../lib/i18n'
import CartoonAvatar from '../CartoonAvatar'

interface Props {
  onDone: () => void
}

export default function OnboardingCelebration({ onDone }: Props) {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => { setTimeout(() => setShow(true), 100) }, [])

  const txt: Localized<Record<'title' | 'subtitle' | 'step1' | 'step1d' | 'step2' | 'step2d' | 'step3' | 'step3d' | 'step4' | 'step4d' | 'bonus' | 'bonusDesc' | 'cta', string>> = {
    en: {
      title: 'You\'re in!',
      subtitle: 'Get ready to go live on ShaPop',
      step1: 'Create your first live',
      step1d: 'Schedule a show and let buyers know',
      step2: 'Add products to sell',
      step2d: 'List items with photos and prices',
      step3: 'Attract buyers',
      step3d: 'Share your stream on social media',
      step4: 'Go live & earn!',
      step4d: 'Start selling to a live audience',
      bonus: '7 free days',
      bonusDesc: 'Zero commission on your first week of sales!',
      cta: 'Let\'s go!',
    },
    fr: {
      title: 'Tu es dedans !',
      subtitle: 'Prépare-toi à passer en live sur ShaPop',
      step1: 'Crée ton premier live',
      step1d: 'Programme un show et préviens les acheteurs',
      step2: 'Ajoute des produits',
      step2d: 'Mets en ligne des articles avec photos et prix',
      step3: 'Attire des acheteurs',
      step3d: 'Partage ton live sur les réseaux sociaux',
      step4: 'Passe en live et gagne !',
      step4d: 'Commence à vendre à un public en direct',
      bonus: '7 jours gratuits',
      bonusDesc: 'Zéro commission pendant ta première semaine !',
      cta: 'C\'est parti !',
    },
    es: {
      title: '¡Ya estás dentro!',
      subtitle: 'Prepárate para hacer directos en ShaPop',
      step1: 'Crea tu primer directo',
      step1d: 'Programa un show y avisa a los compradores',
      step2: 'Añade productos',
      step2d: 'Publica artículos con fotos y precios',
      step3: 'Atrae compradores',
      step3d: 'Comparte tu directo en redes sociales',
      step4: '¡Emite y gana!',
      step4d: 'Empieza a vender en directo',
      bonus: '7 días gratis',
      bonusDesc: '¡Cero comisión durante tu primera semana!',
      cta: '¡Vamos!',
    },
    ru: {
      title: 'Ты в деле!',
      subtitle: 'Готовься выйти в эфир на ShaPop',
      step1: 'Создай первый эфир',
      step1d: 'Запланируй шоу и предупреди покупателей',
      step2: 'Добавь товары',
      step2d: 'Выложи товары с фото и ценами',
      step3: 'Привлеки покупателей',
      step3d: 'Поделись эфиром в соцсетях',
      step4: 'Выходи в эфир и зарабатывай!',
      step4d: 'Начни продавать зрителям в прямом эфире',
      bonus: '7 дней бесплатно',
      bonusDesc: 'Без комиссии в первую неделю!',
      cta: 'Поехали!',
    },
    he: {
      title: 'נכנסת!',
      subtitle: 'תתכונן/י לעלות לשידור חי ב-ShaPop',
      step1: 'צור/י את השידור הראשון',
      step1d: 'תזמן/י שידור ותעדכן/י את הקונים',
      step2: 'הוסף/י מוצרים למכירה',
      step2d: 'העלה/י פריטים עם תמונות ומחירים',
      step3: 'משוך/י קונים',
      step3d: 'שתף/י את השידור ברשתות החברתיות',
      step4: 'עלה/י לשידור והרוויח/י!',
      step4d: 'התחל/י למכור לקהל בשידור חי',
      bonus: '7 ימים חינם',
      bonusDesc: 'אפס עמלה בשבוע הראשון שלך!',
      cta: 'יאללה!',
    },
  }

  const t = tr(txt)

  const steps = [
    { num: '1', title: t.step1, desc: t.step1d, icon: '📺' },
    { num: '2', title: t.step2, desc: t.step2d, icon: '📦' },
    { num: '3', title: t.step3, desc: t.step3d, icon: '📣' },
    { num: '4', title: t.step4, desc: t.step4d, icon: '🚀' },
  ]

  const confettiColors = ['#00E5FF', '#FFD700', '#00D4FF', '#FF6B6B', '#0091EA', '#00E5FF', '#00E5FF', '#00E5FF', '#fff']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#000',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Confetti - more particles, varied shapes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 50 }).map((_, i) => {
          const color = confettiColors[i % confettiColors.length]
          const left = Math.random() * 100
          const delay = Math.random() * 2
          const duration = 2 + Math.random() * 3
          const size = 4 + Math.random() * 10
          const rotation = Math.random() * 360
          const isCircle = i % 3 === 0
          return (
            <div
              key={`confetti-${i}`}
              style={{
                position: 'absolute',
                left: `${left}%`, // i18n-ignore
                top: '-20px',
                width: `${size}px`,
                height: isCircle ? `${size}px` : `${size * 0.5}px`,
                backgroundColor: color,
                borderRadius: isCircle ? '50%' : '2px',
                transform: `rotate(${rotation}deg)`,
                animation: `confettiFall ${duration}s ease-in ${delay}s infinite`,
                opacity: 0,
              }}
            />
          )
        })}
      </div>

      {/* Glow effect behind avatar */}
      <div style={{
        position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', // i18n-ignore
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 229, 255,0.3) 0%, transparent 70%)',
        filter: 'blur(30px)',
      }} />

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)',
        overflowY: 'auto', paddingBottom: '120px',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease',
      }}>
        {/* Avatar with animated ring */}
        <div style={{
          position: 'relative', width: '110px', height: '110px', marginBottom: '24px',
        }}>
          <div style={{
            position: 'absolute', inset: '-4px', borderRadius: '50%',
            background: 'conic-gradient(#00E5FF, #FFD700, #00E5FF)',
            animation: 'spinSlow 4s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: '3px', borderRadius: '50%', backgroundColor: '#000',
          }} />
          <div style={{
            position: 'absolute', inset: '5px', borderRadius: '50%', overflow: 'hidden',
          }}>
            <CartoonAvatar seed={profile?.username || profile?.id || 'seller'} size={100} />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'calc(32px * var(--fs, 1))', fontWeight: 800, color: '#fff', textAlign: 'center',
          marginBottom: '8px', letterSpacing: '-0.5px',
        }}>
          {t.title}
        </h1>
        <p style={{
          fontSize: 'calc(15px * var(--fs, 1))', color: '#f0f0f0', textAlign: 'center', marginBottom: '36px',
          padding: '0 20px',
        }}>
          {t.subtitle}
        </p>

        {/* Steps checklist - card style */}
        <div style={{
          width: '100%', maxWidth: '360px', padding: '0 20px',
        }}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', marginBottom: '8px',
                backgroundColor: '#111', borderRadius: '16px',
                border: '1px solid #1A1A1A',
                opacity: show ? 1 : 0,
                transform: show ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.5s ease ${0.3 + i * 0.1}s`,
              }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #1A1A1A, #222)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'calc(22px * var(--fs, 1))', flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'calc(15px * var(--fs, 1))', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{step.title}</p>
                <p style={{ fontSize: 'calc(12px * var(--fs, 1))', color: '#f0f0f0' }}>{step.desc}</p>
              </div>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid #333', flexShrink: 0,
              }} />
            </div>
          ))}
        </div>

        {/* Bonus card */}
        <div style={{
          margin: '20px 20px 0', padding: '18px 20px', borderRadius: '18px',
          background: 'linear-gradient(135deg, #1A0F1E, #1E150A)',
          border: '1px solid rgba(0, 229, 255,0.2)',
          maxWidth: '360px', width: 'calc(100% - 40px)',
          display: 'flex', alignItems: 'center', gap: '14px',
          opacity: show ? 1 : 0,
          transition: 'all 0.5s ease 0.8s',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: 'calc(22px * var(--fs, 1))',
          }}>
            🎁
          </div>
          <div>
            <p style={{ fontSize: 'calc(16px * var(--fs, 1))', fontWeight: 800, color: '#00E5FF' }}>{t.bonus}</p>
            <p style={{ fontSize: 'calc(13px * var(--fs, 1))', color: '#f0f0f0', marginTop: '2px' }}>{t.bonusDesc}</p>
          </div>
        </div>
      </div>

      {/* CTA button */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 20px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'linear-gradient(to top, #000 60%, transparent)',
      }}>
        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, #00E5FF, #0091EA)',
            borderRadius: '16px', border: 'none',
            color: '#001014', fontSize: 'calc(18px * var(--fs, 1))', fontWeight: 800,
            cursor: 'pointer', letterSpacing: '-0.3px',
            boxShadow: '0 8px 30px rgba(0, 229, 255,0.3)',
          }}
        >
          {t.cta}
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          50% { opacity: 0.8; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes spinSlow {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
