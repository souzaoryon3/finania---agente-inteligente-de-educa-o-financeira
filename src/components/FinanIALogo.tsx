interface FinanIALogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function FinanIALogo({ size = 'md', showWordmark = true }: FinanIALogoProps) {
  const iconDimensions =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <div
        className={`${iconDimensions} rounded-xl bg-gradient-to-br from-[#0F2038] to-[#091224] border border-emerald-500/30 flex items-center justify-center shadow-sm`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[62%] h-[62%]"
        >
          <rect
            x="4.5"
            y="17.5"
            width="4.5"
            height="9.5"
            rx="1.5"
            fill="#34D399"
            fillOpacity="0.55"
          />
          <rect
            x="11.75"
            y="12.5"
            width="4.5"
            height="14.5"
            rx="1.5"
            fill="#10B981"
            fillOpacity="0.82"
          />
          <rect
            x="19"
            y="6.5"
            width="4.5"
            height="20.5"
            rx="1.5"
            fill="#10B981"
          />
          <path
            d="M5 13.5L13.5 8.5L20 10.5L27 4.5"
            stroke="#6EE7B7"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M23.5 4.5H27V8"
            stroke="#6EE7B7"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-slate-50 text-lg whitespace-nowrap">
          Finan<span className="text-emerald-400">IA</span>
        </span>
      )}
    </div>
  );
}
