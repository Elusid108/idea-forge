export default function IdeaForgeLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Brain */}
      <path
        d="M32 8c-6 0-11 3-13 8-3 1-5 4-5 8 0 3 1.5 5.5 4 7l-1 3h30l-1-3c2.5-1.5 4-4 4-7 0-4-2-7-5-8-2-5-7-8-13-8z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Brain fold line */}
      <path
        d="M32 10v22"
        stroke="var(--background, #1a1a2e)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M26 16c-2 2-2 5 0 7M38 16c2 2 2 5 0 7"
        stroke="var(--background, #1a1a2e)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Anvil */}
      <rect x="16" y="38" width="32" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="20" y="44" width="24" height="4" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="24" y="48" width="16" height="8" rx="1" fill="currentColor" opacity="0.6" />
      {/* Mallet */}
      <rect x="44" y="4" width="6" height="14" rx="2" fill="currentColor" opacity="0.65" transform="rotate(25, 47, 11)" />
      <rect x="45" y="16" width="2" height="12" rx="1" fill="currentColor" opacity="0.45" transform="rotate(25, 46, 22)" />
    </svg>
  );
}
