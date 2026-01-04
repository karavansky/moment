import React from "react";

//import { IconSvgProps } from "@/types";
import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};
export const LogoMoment: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => (
<svg
  width={size || width}
  height={size || height}
  viewBox="0 0 256 256"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>

  <defs>
    {/* Градиент пина */}
    <linearGradient id="pinGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1E90FF"/>
      <stop offset="100%" stopColor="#FF8C1A"/>
    </linearGradient>

    {/* Внутренний круг */}
    <radialGradient id="innerCircle" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#2AA7FF"/>
      <stop offset="100%" stopColor="#0B3C74"/>
    </radialGradient>

    {/* Тень */}
    <radialGradient id="shadowGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="currentColor" stopOpacity="0.35"/>
      <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
    </radialGradient>
  </defs>

  {/* Тень на карте */}
  <ellipse
    cx="128"
    cy="214"
    rx="62"
    ry="16"
    fill="url(#shadowGradient)"
  />

  {/* Волны активности */}
  <path
    d="M44 132 C74 98, 112 98, 142 132"
    stroke="#1E90FF"
    strokeWidth="10"
    strokeLinecap="round"
    opacity="0.4"
  />
  <path
    d="M114 132 C144 98, 182 98, 212 132"
    stroke="#FF8C1A"
    strokeWidth="10"
    strokeLinecap="round"
    opacity="0.4"
  />

  {/* Пин */}
  <path
    d="M128 28
       C88 28, 64 58, 64 96
       C64 148, 128 216, 128 216
       C128 216, 192 148, 192 96
       C192 58, 168 28, 128 28Z"
    fill="url(#pinGradient)"
  />

  {/* Внутренний круг */}
  <circle
    cx="128"
    cy="96"
    r="38"
    fill="url(#innerCircle)"
  />

  {/* Галочка подтверждения */}
  <path
    d="M110 96 L124 110 L150 82"
    stroke="white"
    strokeWidth="10"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />

</svg>
);

export const Doc: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => (
  <svg
    direction="ltr"
    height={size || height}
    version="1.1"
    viewBox="0 0 59 45.533203125"
    width={size || width}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g fillRule="nonzero" transform="scale(1,-1) translate(0,-59.533203125)">
      <path
        d="
    M 11.0,7.154296875
    L 34.267578125,7.154296875
    C 37.85546875,7.154296875 39.767578125,9.06640625 39.767578125,12.67578125
    L 39.767578125,34.1171875
    C 39.767578125,35.556640625 39.509765625,36.22265625 38.650390625,37.08203125
    L 24.470703125,51.240234375
    C 23.611328125,52.12109375 22.9453125,52.37890625 21.505859375,52.37890625
    L 11.0,52.37890625
    C 7.455078125,52.37890625 5.478515625,50.466796875 5.478515625,46.857421875
    L 5.478515625,12.67578125
    C 5.478515625,9.06640625 7.390625,7.154296875 11.0,7.154296875
    Z
    M 11.04296875,8.20703125
    C 8.078125,8.20703125 6.53125,9.75390625 6.53125,12.71875
    L 6.53125,46.814453125
    C 6.53125,49.671875 8.078125,51.326171875 11.04296875,51.326171875
    L 22.107421875,51.326171875
    L 22.107421875,37.490234375
    C 22.107421875,35.513671875 23.07421875,34.71875 24.87890625,34.71875
    L 38.71484375,34.71875
    L 38.71484375,12.71875
    C 38.71484375,9.75390625 37.189453125,8.20703125 34.203125,8.20703125
    Z
    M 24.921875,35.771484375
    C 23.654296875,35.771484375 23.16015625,36.265625 23.16015625,37.533203125
    L 23.16015625,51.046875
    L 38.435546875,35.771484375
    Z
"
        fill="currentColor"
        fillOpacity={1.0}
        stroke="currentColor"
        strokeWidth={1.0}
      />
    </g>
  </svg>
);

export const PostgreSQL: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    //    fill="none"
    height={size || height}
    viewBox="-33 -8 570 500"
    width={size || width}
    {...props}
    //    focusable="false"
    //    stroke="currentColor"
    //    strokeWidth="2"
    //    strokeLinecap="round"
    //    strokeLinejoin="round"
  >
    <rect
      height="475.25626"
      id="rect3653"
      style={{
        fill: "transparent",
        fillOpacity: 1,
        stroke: "currentColor",
        strokeWidth: 0.8,
        strokeOpacity: 1,
      }}
      width="537.71851"
      x="-33.494247"
      y="-8.1472559"
    />
    <g id="g3619">
      <path
        d="m 402.395,271.23 c -50.302,10.376 -53.76,-6.655 -53.76,-6.655 53.111,-78.808 75.313,-178.843 56.153,-203.326 -52.27,-66.785 -142.752,-35.2 -144.262,-34.38 l -0.486,0.087 c -9.938,-2.063 -21.06,-3.292 -33.56,-3.496 -22.761,-0.373 -40.026,5.967 -53.127,15.902 0,0 -161.411,-66.495 -153.904,83.63 1.597,31.938 45.776,241.657 98.471,178.312 19.26,-23.163 37.869,-42.748 37.869,-42.748 9.243,6.14 20.308,9.272 31.908,8.147 l 0.901,-0.765 c -0.28,2.876 -0.152,5.689 0.361,9.019 -13.575,15.167 -9.586,17.83 -36.723,23.416 -27.459,5.659 -11.328,15.734 -0.796,18.367 12.768,3.193 42.307,7.716 62.266,-20.224 l -0.796,3.188 c 5.319,4.26 9.054,27.711 8.428,48.969 -0.626,21.259 -1.044,35.854 3.147,47.254 4.191,11.4 8.368,37.05 44.042,29.406 29.809,-6.388 45.256,-22.942 47.405,-50.555 1.525,-19.631 4.976,-16.729 5.194,-34.28 l 2.768,-8.309 c 3.192,-26.611 0.507,-35.196 18.872,-31.203 l 4.463,0.392 c 13.517,0.615 31.208,-2.174 41.591,-7 22.358,-10.376 35.618,-27.7 13.573,-23.148 l 0.002,0 z"
        id="path2464"
        style={{
          fill: "currentColor",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "currentColor",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 215.866,286.484 c -1.385,49.516 0.348,99.377 5.193,111.495 4.848,12.118 15.223,35.688 50.9,28.045 29.806,-6.39 40.651,-18.756 45.357,-46.051 3.466,-20.082 10.148,-75.854 11.005,-87.281"
        id="path2466"
        style={{
          fill: "currentColor",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "currentColor",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 173.104,38.256 c 0,0 -161.521,-66.016 -154.012,84.109 1.597,31.938 45.779,241.664 98.473,178.316 19.256,-23.166 36.671,-41.335 36.671,-41.335"
        id="path2468"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 260.349,26.207 c -5.591,1.753 89.848,-34.889 144.087,34.417 19.159,24.484 -3.043,124.519 -56.153,203.329"
        id="path2470"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 348.282,263.953 c 0,0 3.461,17.036 53.764,6.653 22.04,-4.552 8.776,12.774 -13.577,23.155 -18.345,8.514 -59.474,10.696 -60.146,-1.069 -1.729,-30.355 21.647,-21.133 19.96,-28.739 -1.525,-6.85 -11.979,-13.573 -18.894,-30.338 -6.037,-14.633 -82.796,-126.849 21.287,-110.183 3.813,-0.789 -27.146,-99.002 -124.553,-100.599 -97.385,-1.597 -94.19,119.762 -94.19,119.762"
        id="path2472"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "bevel",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 188.604,274.334 c -13.577,15.166 -9.584,17.829 -36.723,23.417 -27.459,5.66 -11.326,15.733 -0.797,18.365 12.768,3.195 42.307,7.718 62.266,-20.229 6.078,-8.509 -0.036,-22.086 -8.385,-25.547 -4.034,-1.671 -9.428,-3.765 -16.361,3.994 l 0,0 z"
        id="path2474"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 187.715,274.069 c -1.368,-8.917 2.93,-19.528 7.536,-31.942 6.922,-18.626 22.893,-37.255 10.117,-96.339 -9.523,-44.029 -73.396,-9.163 -73.436,-3.193 -0.039,5.968 2.889,30.26 -1.067,58.548 -5.162,36.913 23.488,68.132 56.479,64.938"
        id="path2476"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 172.517,141.7 c -0.288,2.039 3.733,7.48 8.976,8.207 5.234,0.73 9.714,-3.522 9.998,-5.559 0.284,-2.039 -3.732,-4.285 -8.977,-5.015 -5.237,-0.731 -9.719,0.333 -9.996,2.367 l -0.001,0 z"
        id="path2478"
        style={{
          fill: "#ffffff",
          fillOpacity: 1,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 4.15500021,
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 331.941,137.543 c 0.284,2.039 -3.732,7.48 -8.976,8.207 -5.238,0.73 -9.718,-3.522 -10.005,-5.559 -0.277,-2.039 3.74,-4.285 8.979,-5.015 5.239,-0.73 9.718,0.333 10.002,2.368 l 0,-0.001 z"
        id="path2480"
        style={{
          fill: "#ffffff",
          fillOpacity: 1,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 2.07750009999999996,
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d="m 350.676,123.432 c 0.863,15.994 -3.445 26.888 -3.988 43.914 -0.804 24.748 11.799 53.074 -7.191 81.435"
        id="path2482"
        style={{
          fill: "#ffffff",
          fillOpacity: 0,
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 12.46510029,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
          strokeOpacity: 1,
        }}
      />
      <path
        d=""
        id="path2484"
        style={{
          fillRule: "nonzero",
          stroke: "#ffffff",
          strokeWidth: 3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeMiterlimit: 4,
        }}
      />
    </g>
  </svg>
);

export const IndikatorClose: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    fill="none"
    height={size || height}
    style={{ transform: "rotate(-90deg)" }}
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
  >
    <path clipRule="evenodd" d="M15.5 19l-7-7 7-7" fill="none" />
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
  </svg>
);

export const IndikatorOpen: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    fill="none"
    height={size || height}
    style={{ transform: "rotate(180deg)" }}
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
  >
    <path clipRule="evenodd" d="M15.5 19l-7-7 7-7" fill="none" />
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
  </svg>
);

export const Logo: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    fill="none"
    height={size || height}
    viewBox="0 0 150 82"
    width={size || width}
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M5.255,3.167L-0.059,3.167L-0.059,13.516L10.569,13.516L10.569,7.132C10.569,4.274 8.189,3.167 5.255,3.167M5.255,19.365L-0.059,19.365L-0.059,75.657C-0.059,78.515 2.32,79.621 5.255,79.621L10.569,79.621L10.569,23.33C10.569,20.472 8.189,19.365 5.255,19.365M75.611,8.44L77.359,8.44C77.843,8.44 79.536,8.529 79.536,8.529C81.923,8.525 82.845,6.64 82.845,4.316L82.845,0.811C82.48,0.697 81.837,0.583 81.121,0.477C81.121,0.477 78.275,0.091 77.359,0.091L75.611,0.091C61.036,0.091 60.469,11.8 60.469,14.159L60.469,19.365L59.341,19.365C57.336,19.365 56.557,20.949 56.557,22.905L56.557,26.459L60.468,26.459L60.461,75.64L60.461,75.673C60.471,78.52 62.844,79.621 65.772,79.621L71.091,79.621L71.091,26.459L75.5,26.459C77.515,26.459 78.295,24.869 78.295,22.906L78.295,19.365L71.091,19.365L71.091,13.828C71.091,8.827 74.972,8.44 75.611,8.44ZM149.929,62.706C149.929,49.305 130.262,42.849 130.262,33.051L130.262,31.218C130.262,28.934 131.651,26.199 134.822,26.199C137.913,26.199 139.313,28.934 139.313,31.218L139.313,33.345C139.359,36.136 141.71,37.226 144.613,37.226L149.929,37.226L149.929,32.662C149.929,30.518 149.36,18.595 134.782,18.595C120.21,18.595 119.64,30.303 119.64,32.662L119.64,34.451C119.64,46.83 139.302,52.124 139.302,64.224L139.319,67.811C139.319,68.795 139.057,69.862 138.51,70.763C138.505,70.774 138.493,70.791 138.488,70.802C138.482,70.808 138.476,70.813 138.476,70.819C137.748,71.975 136.535,72.832 134.759,72.832C131.668,72.832 130.274,70.096 130.274,67.81L130.274,60.232C130.262,57.385 127.889,56.284 124.957,56.284L119.646,56.284L119.646,66.298C119.646,66.804 119.68,67.85 119.919,69.157C120.682,73.394 123.619,80.406 134.799,80.406C149.372,80.406 149.941,68.7 149.941,66.337L149.929,62.706ZM39.576,75.668C39.583,78.515 41.958,79.621 44.887,79.621L50.199,79.621L50.199,75.668C50.199,75.668 50.2,75.662 50.2,75.657C50.2,75.657 50.199,75.651 50.199,75.646L50.199,32.395C50.199,29.423 50.243,18.581 38.864,18.581C33.792,18.581 30.538,22.692 30.493,22.752C30.493,22.752 30.418,19.366 25.218,19.366L19.904,19.366L19.904,75.646C19.904,75.651 19.903,75.651 19.903,75.651C19.903,75.662 19.904,75.668 19.904,75.668C19.911,78.515 22.285,79.621 25.215,79.621L30.529,79.621L30.529,33.242C30.529,28.658 31.917,26.199 35.086,26.199C38.179,26.199 39.576,28.934 39.576,31.218L39.576,75.668L39.576,75.668ZM96.478,18.471C81.906,18.471 82.532,29.383 82.532,31.49L82.532,33.121C82.537,35.971 84.911,37.074 87.843,37.074L91.947,37.074L91.947,31.067C91.947,28.782 93.336,26.049 96.506,26.049C99.597,26.049 100.998,28.782 100.998,31.067L100.998,46.219C100.65,45.563 96.466,42.793 92.664,42.793C85.008,42.793 81.329,47.461 81.329,56.606L81.329,66.593C81.329,75.74 85.008,80.405 92.664,80.405C95.817,80.405 98.88,78.832 101.037,76.235C101.037,76.235 101.265,79.621 106.314,79.621L111.625,79.621L111.625,32.54C111.625,30.398 111.056,18.471 96.478,18.471ZM100.941,68.678C100.941,70.963 99.552,73.699 96.387,73.699C93.29,73.699 91.896,70.963 91.896,68.678L91.896,54.504C91.896,52.219 93.285,49.483 96.45,49.483C99.546,49.483 100.941,52.219 100.941,54.504L100.941,68.678Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const DiscordIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      height={size || height}
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M14.82 4.26a10.14 10.14 0 0 0-.53 1.1 14.66 14.66 0 0 0-4.58 0 10.14 10.14 0 0 0-.53-1.1 16 16 0 0 0-4.13 1.3 17.33 17.33 0 0 0-3 11.59 16.6 16.6 0 0 0 5.07 2.59A12.89 12.89 0 0 0 8.23 18a9.65 9.65 0 0 1-1.71-.83 3.39 3.39 0 0 0 .42-.33 11.66 11.66 0 0 0 10.12 0q.21.18.42.33a10.84 10.84 0 0 1-1.71.84 12.41 12.41 0 0 0 1.08 1.78 16.44 16.44 0 0 0 5.06-2.59 17.22 17.22 0 0 0-3-11.59 16.09 16.09 0 0 0-4.09-1.35zM8.68 14.81a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.93 1.93 0 0 1 1.8 2 1.93 1.93 0 0 1-1.8 2zm6.64 0a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.92 1.92 0 0 1 1.8 2 1.92 1.92 0 0 1-1.8 2z"
        fill="currentColor"
      />
    </svg>
  );
};

export const TwitterIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      height={size || height}
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.611-.1-.923a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z"
        fill="currentColor"
      />
    </svg>
  );
};

export const GitlabIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  ...props
}) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path clipRule="evenodd" d="M21 14l-9 7l-9 -7l3 -11l3 7h6l3 -7z" />
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    </svg>
  );
};
// <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"
//  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"
//  class="icon icon-tabler icons-tabler-outline icon-tabler-brand-gitlab">
// <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
// <path d="M21 14l-9 7l-9 -7l3 -11l3 7h6l3 -7z" />
// </svg>

//     aria-hidden='true'
export const MoonFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path
      d="M21.53 15.93c-.16-.27-.61-.69-1.73-.49a8.46 8.46 0 01-1.88.13 8.409 8.409 0 01-5.91-2.82 8.068 8.068 0 01-1.44-8.66c.44-1.01.13-1.54-.09-1.76s-.77-.55-1.83-.11a10.318 10.318 0 00-6.32 10.21 10.475 10.475 0 007.04 8.99 10 10 0 002.89.55c.16.01.32.02.48.02a10.5 10.5 0 008.47-4.27c.67-.93.49-1.519.32-1.79z"
      fill="currentColor"
    />
  </svg>
);

//     aria-hidden='true'

export const SunFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <g fill="currentColor">
      <path d="M19 12a7 7 0 11-7-7 7 7 0 017 7z" />
      <path d="M12 22.96a.969.969 0 01-1-.96v-.08a1 1 0 012 0 1.038 1.038 0 01-1 1.04zm7.14-2.82a1.024 1.024 0 01-.71-.29l-.13-.13a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.984.984 0 01-.7.29zm-14.28 0a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a1 1 0 01-.7.29zM22 13h-.08a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zM2.08 13H2a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zm16.93-7.01a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a.984.984 0 01-.7.29zm-14.02 0a1.024 1.024 0 01-.71-.29l-.13-.14a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.97.97 0 01-.7.3zM12 3.04a.969.969 0 01-1-.96V2a1 1 0 012 0 1.038 1.038 0 01-1 1.04z" />
    </g>
  </svg>
);
/*
<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  
stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-login-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>
<path d="M9 8v-2a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-2" />
<path d="M3 12h13l-3 -3" /><path d="M13 15l3 -3" /></svg>
*/
export const LoginIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    fill="none"
    focusable="false"
    height={size || height}
    role="presentation"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    <path d="M9 8v-2a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-2" />
    <path d="M3 12h13l-3 -3" />
    <path d="M13 15l3 -3" />
  </svg>
);
export const LogoutIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    fill="none"
    focusable="false"
    height={size || height}
    role="presentation"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
    <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
    <path d="M9 12h12l-3 -3" />
    <path d="M18 15l3 -3" />
  </svg>
);
// <svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-logout"><path stroke="none" d="M0 0h24v24H0z" fill="none"/>
// <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
// <path d="M9 12h12l-3 -3" />
// <path d="M18 15l3 -3" />
// </svg>
export const SearchIcon = (props: IconSvgProps) => (
  <svg
    //    aria-hidden='true'
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path
      d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M22 22L20 20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

export const PlusIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M6 12h12" />
        <path d="M12 18V6" />
      </g>
    </svg>
  );
};

export const VerticalDotsIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill="currentColor"
      />
    </svg>
  );
};

export const SearchIcon2 = (props: IconSvgProps) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M22 22L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

export const ChevronDownIcon = ({
  strokeWidth = 1.5,
  ...otherProps
}: IconSvgProps) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...otherProps}
    >
      <path
        d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

export const EraserIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
      <path d="M18 13.3l-6.3 -6.3" />
    </svg>
  );
};
//       class='icon icon-tabler icons-tabler-outline icon-tabler-eraser'
export const ChevronLeftIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M15 6l-6 6l6 6" />
    </svg>
  );
};

export const DeleteIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      viewBox="0 0 24 24"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M21.07 5.23c-1.61-.16-3.22-.28-4.84-.37v-.01l-.22-1.3c-.15-.92-.37-2.3-2.71-2.3h-2.62c-2.33 0-2.55 1.32-2.71 2.29l-.21 1.28c-.93.06-1.86.12-2.79.21l-2.04.2c-.42.04-.72.41-.68.82.04.41.4.71.82.67l2.04-.2c5.24-.52 10.52-.32 15.82.21h.08c.38 0 .71-.29.75-.68a.766.766 0 0 0-.69-.82Z"
        fill="currentColor"
      />
      <path
        d="M19.23 8.14c-.24-.25-.57-.39-.91-.39H5.68c-.34 0-.68.14-.91.39-.23.25-.36.59-.34.94l.62 10.26c.11 1.52.25 3.42 3.74 3.42h6.42c3.49 0 3.63-1.89 3.74-3.42l.62-10.25c.02-.36-.11-.7-.34-.95Z"
        fill="currentColor"
        opacity={0.399}
      />
      <path
        clipRule="evenodd"
        d="M9.58 17a.75.75 0 0 1 .75-.75h3.33a.75.75 0 0 1 0 1.5h-3.33a.75.75 0 0 1-.75-.75ZM8.75 13a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

export const MenuIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
};

export const CloseIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => {
  return (
    <svg
      fill="none"
      height={size || height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size || width}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
};
