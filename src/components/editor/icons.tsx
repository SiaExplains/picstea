/** MYLPER's own minimal icon set (no third-party or proprietary artwork). */

type IconProps = { size?: number };

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const HandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 8V3.5a1 1 0 0 1 2 0V7m0-4.5a1 1 0 0 1 2 0V7m0-3.5a1 1 0 0 1 2 0V8m0-2.5a1 1 0 0 1 2 0V10a4.5 4.5 0 0 1-4.5 4.5h-.6a4 4 0 0 1-3.2-1.6L2.6 10.1a1 1 0 0 1 1.5-1.3L5 9.7" />
  </Svg>
);

export const ZoomIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.75" cy="6.75" r="4.25" />
    <path d="m10 10 4 4" />
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </Svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 2l12 12M6.6 3.7A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.8 2.3M4.2 5A11 11 0 0 0 1.5 8S4 12.5 8 12.5c.9 0 1.8-.2 2.5-.6" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </Svg>
);

export const UnlockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9" />
  </Svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </Svg>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </Svg>
);

export const DuplicateIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="5" width="8.5" height="8.5" rx="1" />
    <path d="M11 5V3.5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1H5" />
  </Svg>
);

export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2.5" width="12" height="11" rx="1" />
    <circle cx="5.5" cy="6" r="1.2" />
    <path d="m2.5 12 3.5-3.5 2.5 2.5 2-2 3 3" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Svg>
);

export const MoveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.5v13M1.5 8h13M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" />
  </Svg>
);

export const CropIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 1.5V12h10.5M1.5 4H12v10.5" />
  </Svg>
);

export const BrushIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 2.5 7 9" />
    <path d="M6.2 9.3c-1.6-.2-2.9 1-3 2.6-.1 1.1-.7 1.8-1.7 2.1 2.6.9 5.3.2 5.9-2 .3-1.2-.1-2.2-1.2-2.7Z" />
  </Svg>
);

export const EraserIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 13.5h8M2.8 9.7l6-6a1.4 1.4 0 0 1 2 0l2.5 2.5a1.4 1.4 0 0 1 0 2L8 13.5H5.2L2.8 11.1a1 1 0 0 1 0-1.4Z" />
    <path d="m5.5 7 4.5 4.5" />
  </Svg>
);

export const ShapeIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="1.5" y="1.5" width="8" height="8" rx="0.5" />
    <circle cx="10.5" cy="10.5" r="4" />
  </Svg>
);

export const PenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 1.5 12.5 7 9.5 12.5h-3L3.5 7Z" />
    <circle cx="8" cy="8" r="1" />
    <path d="M8 1.5V7M6 14.5h4" />
  </Svg>
);

export const PathSelectIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 2.5v10l3-3 2 4.5 1.6-.7-2-4.4H12Z" />
  </Svg>
);

export const TextIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3.5V2.5h10v1M8 2.5v11M6 13.5h4" />
  </Svg>
);

export const SwapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6V4.5a1.5 1.5 0 0 1 1.5-1.5H11m0 0L9.5 1.5M11 3 9.5 4.5" />
  </Svg>
);

export const FolderIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M1.5 4.5a1 1 0 0 1 1-1h3.3l1.5 1.5h6.2a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" />
  </Svg>
);

export const ChevronIcon = ({ open, ...p }: IconProps & { open: boolean }) => (
  <Svg {...p}>
    <path d={open ? "m4 6 4 4 4-4" : "m6 4 4 4-4 4"} />
  </Svg>
);

export const MaskIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2.5" width="12" height="11" rx="1" />
    <circle cx="8" cy="8" r="3" fill="currentColor" />
  </Svg>
);

export const AdjustIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 2.5v11" />
    <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />
  </Svg>
);

export const MarqueeIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="3.5" width="11" height="9" strokeDasharray="2 1.6" />
  </Svg>
);

export const LassoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 11.5C2.6 10.6 1.8 9.1 2.2 7.4 2.8 4.8 5.6 3 8.8 3c3 0 5.2 1.6 5.2 3.8 0 2.6-3 4.4-6.6 4.4-1 0-2-.1-2.9-.4" />
    <path d="M4.5 11.5c-.4 1.2.2 2.2 1.4 2" />
  </Svg>
);

export const WandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m2.5 13.5 7-7" />
    <path d="M11 1.8v2.4M11 7.8v2.4M7.8 5H5.4M16.6 5h-2.4M9 3l.9.9M13 7l.9.9M13 3l-.9.9" />
  </Svg>
);

export const EyedropperIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 4.5 2 2M3 13l1-3 5.5-5.5 2 2L6 12l-3 1Z" />
    <path d="M10.5 3.5 12 2a1.4 1.4 0 0 1 2 2l-1.5 1.5" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 2.5 13.5 5.5 5.5 13.5 2 14l.5-3.5 8-8Z" />
    <path d="m9 4 3 3" />
  </Svg>
);

export const BucketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m7 2.5 5.5 5.5-4.8 4.8a1.5 1.5 0 0 1-2.1 0L2.2 9.4a1.5 1.5 0 0 1 0-2.1L7 2.5Z" />
    <path d="M2.5 8.5h9.5M13.5 10.5s1 1.4 1 2.1a1 1 0 0 1-2 0c0-.7 1-2.1 1-2.1Z" />
  </Svg>
);

export const GradientIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M5 3v10M8 3v10" strokeOpacity="0.6" />
    <path d="M11 3v10" strokeOpacity="0.3" />
  </Svg>
);
