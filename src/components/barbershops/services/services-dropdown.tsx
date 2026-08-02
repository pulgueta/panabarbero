import type { Service } from "@convex/schema";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatServicePrice } from "@/lib/utils";
import { useServicesStore, useServicesStoreActions } from "@/store/services";

interface ServicesDropdownProps {
  services: Service[] | undefined;
}

export const ServicesDropdown: FC<ServicesDropdownProps> = ({ services }) => {
  const [open, setOpen] = useState<boolean>(false);

  const selectedServices = useServicesStore();
  const selectedIds = new Set(selectedServices.map((service) => service._id));
  const { toggleService } = useServicesStoreActions();

  const triggerLabel =
    selectedServices.length === 0
      ? "Seleccionar servicios..."
      : selectedServices.length === 1
        ? selectedServices[0]?.name
        : `${selectedServices.length} servicios`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton
        render={
          <Button
            variant="outline"
            role="combobox"
            size="default"
            aria-expanded={open}
            aria-controls="services-listbox"
            className="w-full justify-between"
          >
            {triggerLabel}
            <CaretUpDownIcon className="opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar servicio..." className="h-9" />
          <CommandList id="services-listbox">
            <CommandEmpty>No se encontraron servicios.</CommandEmpty>
            <CommandGroup>
              {services?.map((service) => (
                <CommandItem
                  key={service._id}
                  value={service._id}
                  // The popover stays open so several services can be toggled
                  // in one visit; it closes on outside click / escape.
                  onSelect={() => toggleService(service)}
                >
                  {service.name}
                  <span className="ml-auto text-muted-foreground text-xs">
                    {formatServicePrice(service)}
                  </span>
                  <CheckIcon
                    className={cn(
                      "size-3",
                      selectedIds.has(service._id)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
