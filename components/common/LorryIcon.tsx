import type { SVGProps } from 'react';

/**
 * A heavy lorry, drawn in the Lucide style (24x24 grid, round caps/joins,
 * currentColor stroke) so it can be dropped into the same icon maps.
 * Lucide only ships `Truck`/`Van`, both of which read as a small delivery van -
 * Vehicle Hire needs something visibly bigger.
 */
export default function LorryIcon({
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Trailer box */}
      <path d="M16 18V5a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h1" />
      {/* Chassis between the axles */}
      <path d="M7 18h10" />
      {/* Cab */}
      <path d="M16 8h3.2a1 1 0 0 1 .8.4l2.6 3.5a1 1 0 0 1 .4.8V17a1 1 0 0 1-1 1h-1" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  );
}
