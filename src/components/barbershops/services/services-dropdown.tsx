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
import { cn } from "@/lib/utils";
import { useServicesStoreActions } from "@/store/services";

interface ServicesDropdownProps {
  services: Service[] | undefined;
}

export const ServicesDropdown: FC<ServicesDropdownProps> = ({ services }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [value, setValue] = useState("");

  const { setServiceStore } = useServicesStoreActions();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            size="default"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {services && value
              ? services.find((service) => service._id === value)?.name
              : "Seleccionar servicio..."}
            <CaretUpDownIcon className="opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar servicio..." className="h-9" />
          <CommandList>
            <CommandEmpty>No se encontraron servicios.</CommandEmpty>
            <CommandGroup>
              {services?.map((service) => (
                <CommandItem
                  key={service._id}
                  value={service._id}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    setServiceStore({
                      service: {
                        ...service,
                      },
                    });
                  }}
                >
                  {service.name}
                  <CheckIcon
                    className={cn(
                      "ml-auto size-3",
                      value === service._id ? "opacity-100" : "opacity-0",
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
