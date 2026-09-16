/** Shared looping doodle used on subject and study activity cards. */
export function CardDoodle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="18" aria-hidden="true" focusable="false">
    <path d="M-30 205C100 245 64 80 156 45S258 150 191 142 64 67 94 14 180-6 166 46 17 46 30 126 112 183 104 134 19 92-20 143" />
  </svg>;
}
