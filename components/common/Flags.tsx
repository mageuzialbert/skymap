import { useId, type SVGProps } from 'react';

// Small inline flags for the language switcher. Drawn as SVG rather than
// emoji because flag emoji do not render on Windows (they show as "GB"/"TZ").

/** United Kingdom - marks English. */
export function FlagUK(props: SVGProps<SVGSVGElement>) {
  // The clip id must be unique per instance: the switcher can be on the page
  // twice, and a clip defined inside a hidden copy does not apply to the other.
  const clipId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      {...props}
    >
      <clipPath id={clipId}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <path d="M0 0v30h60V0z" fill="#012169" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
      <path
        d="M0 0l60 30M60 0L0 30"
        clipPath={`url(#${clipId})`}
        stroke="#c8102e"
        strokeWidth="4"
      />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}

/** Tanzania - marks Swahili. */
export function FlagTZ(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" aria-hidden {...props}>
      <path d="M0 0h30L0 20z" fill="#1eb53a" />
      <path d="M30 0v20H0z" fill="#00a3dd" />
      <path d="M0 20v-5L22.5 0H30v5L7.5 20z" fill="#fcd116" />
      <path d="M0 20v-3L25.5 0H30v3L4.5 20z" fill="#000" />
    </svg>
  );
}

/** Flag for a locale code, defaulting to the UK flag. */
export function LocaleFlag({ code, ...props }: { code: string } & SVGProps<SVGSVGElement>) {
  return code === 'sw' ? <FlagTZ {...props} /> : <FlagUK {...props} />;
}
