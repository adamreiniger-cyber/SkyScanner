/**
 * The SkyShot mark: a camera viewfinder framing a bright star, for observing
 * and astrophotography. Colours come from tokens, so it turns red in night mode.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="logo-mark__frame" d="M3 10V5.5A2.5 2.5 0 0 1 5.5 3H10M22 3h4.5A2.5 2.5 0 0 1 29 5.5V10M29 22v4.5a2.5 2.5 0 0 1-2.5 2.5H22M10 29H5.5A2.5 2.5 0 0 1 3 26.5V22" />
      <path className="logo-mark__star" d="M16 7.5c.5 4.6 3.9 8 8.5 8.5-4.6.5-8 3.9-8.5 8.5-.5-4.6-3.9-8-8.5-8.5 4.6-.5 8-3.9 8.5-8.5z" />
      <circle className="logo-mark__dot" cx="24" cy="8.5" r="1.3" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo__word">
        Sky<span className="logo__accent">Shot</span>
      </span>
    </span>
  )
}
