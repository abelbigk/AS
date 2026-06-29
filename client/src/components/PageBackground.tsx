interface PageBackgroundProps {
  darkSrc: string;
  lightSrc: string;
}

/** Fixed page background without backdrop-filter (GPU-friendly on mobile scroll). */
export default function PageBackground({ darkSrc, lightSrc }: PageBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <img
        src={darkSrc}
        alt=""
        className="hidden dark:block w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="hidden dark:block absolute inset-0 bg-black/78" />
      <img
        src={lightSrc}
        alt=""
        className="block dark:hidden w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="block dark:hidden absolute inset-0 bg-white/82" />
    </div>
  );
}
