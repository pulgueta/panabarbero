import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TimePickerProps {
  day: string;
  open: string;
  close: string;
  isActive: boolean;
  onOpenChange: (value: string) => void;
  onCloseChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
}

export function TimePicker({
  day,
  open,
  close,
  isActive,
  onOpenChange,
  onCloseChange,
  onActiveChange,
}: TimePickerProps) {
  return (
    <div className="flex items-center space-x-4 py-2">
      <Switch
        checked={isActive}
        onCheckedChange={onActiveChange}
        id={`switch-${day}`}
      />
      <Label htmlFor={`switch-${day}`} className="w-24 capitalize">
        {day}
      </Label>
      <div className="flex items-center space-x-2">
        <Input
          type="time"
          value={open}
          onChange={(e) => onOpenChange(e.target.value)}
          disabled={!isActive}
          className="w-32"
        />
        <span className="text-muted-foreground text-sm">a</span>
        <Input
          type="time"
          value={close}
          onChange={(e) => onCloseChange(e.target.value)}
          disabled={!isActive}
          className="w-32"
        />
      </div>
    </div>
  );
}
