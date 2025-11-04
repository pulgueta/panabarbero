import type { Barbershop } from "@panabarbero/convex/schemas";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, PlusIcon } from "lucide-react";
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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

interface BarbershopsDropdownProps {
  barbershops: Barbershop[];
  isLoading: boolean;
}

export const BarbershopsDropdown: FC<BarbershopsDropdownProps> = ({
  barbershops,
  isLoading,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Barbershop["_id"]>(barbershops[0]?._id);

  const navigate = useNavigate();

  const onValueChange = (value: string) => {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, barbershopId: value as Barbershop["_id"] }),
    });
    setValue(value as Barbershop["_id"]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-40 justify-between"
        >
          {isLoading || barbershops.length === 0 ? (
            <Skeleton className="h-4 w-full" />
          ) : value ? (
            barbershops.find((barbershop) => barbershop._id === value)?.name
          ) : (
            "Seleccionar barberia"
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Buscar barbería..." className="h-9" />
          <CommandList>
            <CommandEmpty>No se encontraron barberías.</CommandEmpty>
            <CommandGroup>
              {barbershops.map((barbershop) => (
                <CommandItem
                  key={barbershop._id}
                  value={barbershop._id}
                  onSelect={onValueChange}
                >
                  {barbershop.name}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === barbershop._id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandItem disabled>
            <Link
              to="/profile/barbershops/create"
              className="inline-flex items-center gap-2"
            >
              <PlusIcon className="size-4" />
              Crear nueva barbería (pronto)
            </Link>
          </CommandItem>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
