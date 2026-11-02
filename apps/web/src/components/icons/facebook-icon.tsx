import type { SVGProps } from "react";

export const Facebook = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 666.67 666.67">
    <title>Facebook</title>
    <defs>
      <clipPath id="facebook-a" clipPathUnits="userSpaceOnUse">
        <path d="M0 700h700V0H0Z" />
      </clipPath>
    </defs>
    <g
      clipPath="url(#facebook-a)"
      transform="matrix(1.33 0 0 -1.33 -133.33 800)"
    >
      <path
        d="M0 0c0 138.07-111.93 250-250 250S-500 138.07-500 0c0-117.25 80.72-215.62 189.61-242.64v166.24h-51.55V0h51.55v32.92c0 85.09 38.51 124.53 122.05 124.53 15.84 0 43.17-3.1 54.35-6.21V81.99c-5.9.621-16.15.932-28.88.932-40.99 0-56.83-15.53-56.83-55.9V0h81.66l-14.03-76.4h-67.63v-171.77C-95.93-233.22 0-127.82 0 0"
        style={{
          fill: "#0866ff",
          fillOpacity: 1,
          fillRule: "nonzero",
          stroke: "none",
        }}
        transform="translate(600 350)"
      />
      <path
        d="m0 0 14.03 76.4H-67.63v27.02c0 40.37 15.84 55.9 56.83 55.9 12.73 0 22.98-.31 28.88-.931v69.25c-11.18 3.11-38.51 6.21-54.35 6.21-83.54 0-122.05-39.44-122.05-124.53V76.4h-51.55V0h51.55v-166.24a250.56 250.56 0 0 1 60.39-7.36c10.25 0 20.36.632 30.29 1.83V0Z"
        style={{
          fill: "#fff",
          fillOpacity: 1,
          fillRule: "nonzero",
          stroke: "none",
        }}
        transform="translate(447.92 273.6)"
      />
    </g>
  </svg>
);
