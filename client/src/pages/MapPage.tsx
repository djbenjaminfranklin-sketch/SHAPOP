import { useState } from 'react'
import IsraelMap from '../components/IsraelMap'
import CityStreamSheet from '../components/CityStreamSheet'
import { useCityStreamCounts } from '../hooks/useCityStreamCounts'

export default function MapPage() {
  const { cityData, loading } = useCityStreamCounts()
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  const handleCityTap = (city: string) => {
    setSelectedCity(city)
  }

  const handleClose = () => {
    setSelectedCity(null)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)', backgroundColor: '#000' }}>
        <div style={{ padding: '12px 20px 8px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>
            Streams en direct
          </h1>
          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>
            Tap sur une ville pour voir les lives
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px 80px',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '2px solid #333', borderTopColor: '#F0908A',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <IsraelMap
            cityData={cityData}
            onCityTap={handleCityTap}
            selectedCity={selectedCity}
          />
        )}
      </div>

      {/* Bottom sheet */}
      {selectedCity && cityData[selectedCity] && (
        <CityStreamSheet
          city={selectedCity}
          data={cityData[selectedCity]}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
