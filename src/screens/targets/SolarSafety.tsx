import { useState } from 'react'

export const SDO_IMAGE_URL = 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIC.jpg'
export const SPACE_WEATHER_URL = 'https://www.spaceweatherlive.com/en/solar-activity.html'

/** Shown at the top of the Sun's details, before anything else. */
export function SolarSafety() {
  return (
    <section className="solar-safety" role="note" aria-labelledby="h-solar-safety">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l10 18H2z" />
        <path d="M12 10v5M12 18v.5" />
      </svg>
      <div>
        <h3 id="h-solar-safety">Never look at the Sun without a solar filter</h3>
        <p>
          Even a glance through a telescope, binoculars or a finder can blind you instantly. Only observe with a
          certified solar filter (ISO 12312-2) that covers the whole front of the scope, fitted before you point it at
          the Sun. Cap or remove the finder, and never leave a scope pointed at the Sun with children around.
        </p>
      </div>
    </section>
  )
}

/** Today's Sun from NASA's Solar Dynamics Observatory. Hides itself if it can't load. */
export function SolarImage() {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <figure className="solar-image">
      <img
        src={SDO_IMAGE_URL}
        alt="The Sun today in visible light, showing any sunspots"
        width={256}
        height={256}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <figcaption className="muted small">Latest image from NASA’s Solar Dynamics Observatory.</figcaption>
    </figure>
  )
}
