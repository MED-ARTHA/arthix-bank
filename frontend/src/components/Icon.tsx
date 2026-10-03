import {
  ArrowLeftRight, ArrowRight, Check, Copy, CreditCard, Download, Gift, House, List, Lock,
  LogOut, Menu, Plus, Receipt, Send, ShieldCheck, Target, Trash2, User, X, Zap,
  type LucideIcon,
} from "lucide-react";

const map = {
  home: House,
  plus: Plus,
  send: Send,
  receipt: Receipt,
  target: Target,
  list: List,
  gift: Gift,
  user: User,
  logout: LogOut,
  menu: Menu,
  close: X,
  shield: ShieldCheck,
  card: CreditCard,
  copy: Copy,
  check: Check,
  trash: Trash2,
  swap: ArrowLeftRight,
  lock: Lock,
  arrow: ArrowRight,
  download: Download,
  bolt: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof map;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Cmp = map[name];
  return <Cmp size={size} strokeWidth={1.5} aria-hidden="true" />;
}