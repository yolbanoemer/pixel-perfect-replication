import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  minDate = new Date(1999, 0, 1),
  maxDate = new Date(),
  label = "Choose date",
}: {
  value?: Date | undefined;
  onChange: (date: Date | undefined) => void;
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
  label?: string | undefined;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="size-4" />
          {value ? format(value, "PPP") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={{ before: minDate, after: maxDate }}
          startMonth={minDate}
          endMonth={maxDate}
          captionLayout="dropdown"
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}