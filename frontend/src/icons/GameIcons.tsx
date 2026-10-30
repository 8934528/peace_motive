import type React from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  DoorOpen,
  Eye,
  Fingerprint,
  Gamepad2,
  HelpCircle,
  HeartPulse,
  Info,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Skull,
  Sun,
  Trash2,
  UserMinus,
  Users,
  Vote,
  Wifi,
  WifiOff,
  X,
  XCircle
} from "lucide-react";

export {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  DoorOpen,
  Eye,
  Fingerprint,
  Gamepad2,
  HelpCircle,
  HeartPulse,
  Info,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Skull,
  Sun,
  Trash2,
  UserMinus,
  Users,
  Vote,
  Wifi,
  WifiOff,
  X,
  XCircle
};

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip: string;
  variant?: "default" | "danger";
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  key?: React.Key;
};

export function IconButton({
  tooltip,
  variant = "default",
  className = "",
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-button ${variant === "danger" ? "icon-button-danger" : ""} ${className}`.trim()}
      title={tooltip}
      aria-label={tooltip}
      {...rest}
    >
      {children}
    </button>
  );
}
