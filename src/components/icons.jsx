import React from 'react';

const baseSvg = (path, { size = 18, color = 'currentColor', strokeWidth = 1.8 } = {}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

const Icons = {
  menu: (size) => baseSvg(
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>,
    { size }
  ),
  dashboard: (size) => baseSvg(
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>,
    { size }
  ),
  board: (size) => baseSvg(
    <>
      <rect x="4" y="4" width="4" height="16" rx="1.5" />
      <rect x="10" y="4" width="4" height="10" rx="1.5" />
      <rect x="16" y="4" width="4" height="13" rx="1.5" />
    </>,
    { size }
  ),
  plusCircle: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>,
    { size }
  ),
  chatBubble: (size) => baseSvg(
    <>
      <path d="M21 11.5A7.5 7.5 0 0 0 13.5 4h-3A7.5 7.5 0 0 0 3 11.5c0 3 2 5.7 5 6.8V21l3.4-2h2.1A7.5 7.5 0 0 0 21 11.5Z" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14" x2="13" y2="14" />
    </>,
    { size }
  ),
  bell: (size) => baseSvg(
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>,
    { size }
  ),
  list: (size) => baseSvg(
    <>
      <line x1="8" y1="7" x2="20" y2="7" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="17" x2="20" y2="17" />
      <circle cx="4" cy="7" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="17" r="1.5" />
    </>,
    { size }
  ),
  checkCircle: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12 11 14.5 15.5 10" />
    </>,
    { size }
  ),
  progress: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>,
    { size }
  ),
  sparkles: (size) => baseSvg(
    <>
      <path d="M12 4.5l1.6 3.5L17 9.6l-3.4 1.1L12 14.4l-1.6-3.7L7 9.6l3.4-1.6Z" />
      <path d="M6 17l.9 2 .9-2 .9-2 .9 2 .9 2 .9-2" strokeWidth={1.4} />
      <path d="M17 5l.5 1 .5-1 .5-1 .5 1 .5 1 .5-1" strokeWidth={1.4} />
    </>,
    { size }
  ),
  clipboard: (size) => baseSvg(
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4V3h6v1" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </>,
    { size }
  ),
  story: (size) => baseSvg(
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" />
      <path d="M5 6h12v12" />
      <line x1="5" y1="10" x2="13" y2="10" />
    </>,
    { size }
  ),
  task: (size) => baseSvg(
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <polyline points="9 12.5 11 14.5 15 10.5" />
    </>,
    { size }
  ),
  bug: (size) => baseSvg(
    <>
      <path d="M7 8a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0Z" />
      <line x1="12" y1="3" x2="12" y2="1" />
      <line x1="6" y1="3" x2="8" y2="5" />
      <line x1="18" y1="3" x2="16" y2="5" />
      <line x1="5" y1="13" x2="3" y2="13" />
      <line x1="19" y1="13" x2="21" y2="13" />
      <line x1="5.5" y1="17" x2="3.5" y2="18" />
      <line x1="18.5" y1="17" x2="20.5" y2="18" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </>,
    { size }
  ),
  flag: (size) => baseSvg(
    <>
      <path d="M5 5h10l-2 4 2 4H5" />
      <line x1="5" y1="3" x2="5" y2="21" />
    </>,
    { size }
  ),
  info: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <circle cx="12" cy="9" r="0.5" fill="currentColor" stroke="none" />
    </>,
    { size }
  ),
  warning: (size) => baseSvg(
    <>
      <path d="M12 4 3 20h18Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </>,
    { size }
  ),
  error: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </>,
    { size }
  ),
  success: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </>,
    { size }
  ),
  logout: (size) => baseSvg(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>,
    { size }
  ),
  arrowLeft: (size) => baseSvg(
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="11 18 5 12 11 6" />
    </>,
    { size }
  ),
  close: (size) => baseSvg(
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>,
    { size }
  ),
  send: (size) => baseSvg(
    <>
      <path d="m4 12 16-7-4.5 7L20 19 4 12Z" />
      <line x1="4" y1="12" x2="11" y2="12" />
    </>,
    { size }
  ),
  refresh: (size) => baseSvg(
    <>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <line x1="21" y1="3" x2="21" y2="8" />
    </>,
    { size }
  ),
  userPlus: (size) => baseSvg(
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M2 20v-1a5 5 0 0 1 10 0v1" />
      <line x1="18" y1="9" x2="18" y2="15" />
      <line x1="15" y1="12" x2="21" y2="12" />
    </>,
    { size }
  ),
  activity: (size) => baseSvg(
    <>
      <polyline points="3 12 7 12 10 5 14 19 17 12 21 12" />
    </>,
    { size }
  ),
  settings: (size) => baseSvg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </>,
    { size }
  ),
  upload: (size) => baseSvg(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>,
    { size }
  ),
  download: (size) => baseSvg(
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>,
    { size }
  ),
  fileText: (size) => baseSvg(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>,
    { size }
  ),
  file: (size) => baseSvg(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>,
    { size }
  ),
  filter: (size) => baseSvg(
    <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>,
    { size }
  ),
};

export default Icons;
export { Icons };
