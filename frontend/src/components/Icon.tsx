const paths = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  plus: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M8 12h8",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  gift: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 1 1 0-5c2.5 0 4 5 4 5Zm0 0h4a2.5 2.5 0 1 0 0-5c-2.5 0-4 5-4 5Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  logout: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  card: "M3 6h18v12H3zM3 10h18",
  copy: "M9 9h11v11H9zM5 15V5h10",
  check: "M5 12.5 10 17.5 19 7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  swap: "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}