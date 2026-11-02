import { GlobeSimpleIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { createContext, use, useMemo, useState } from "react";
import type {
  Country,
  FlagProps,
  Props,
  Value,
} from "react-phone-number-input";
import {
  getCountryCallingCode,
  default as PhoneInputComponent,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PhoneInputSize = "sm" | "default" | "lg";

const PhoneInputContext = createContext<{
  variant: PhoneInputSize;
  popupClassName?: string;
  scrollAreaClassName?: string;
}>({
  variant: "default",
  popupClassName: undefined,
  scrollAreaClassName: undefined,
});

type PhoneInputProps = Omit<
  ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<
    Props<typeof PhoneInputComponent>,
    "onChange" | "variant" | "popupClassName" | "scrollAreaClassName"
  > & {
    onChange?: (value: Value) => void;
    variant?: PhoneInputSize;
    popupClassName?: string;
    scrollAreaClassName?: string;
  };

function PhoneInput({
  className,
  variant,
  popupClassName,
  scrollAreaClassName,
  onChange,
  value,
  ...props
}: PhoneInputProps) {
  const phoneInputSize = variant || "default";
  const contextValue = useMemo(
    () => ({ variant: phoneInputSize, popupClassName, scrollAreaClassName }),
    [phoneInputSize, popupClassName, scrollAreaClassName],
  );
  return (
    <PhoneInputContext.Provider value={contextValue}>
      <PhoneInputComponent
        className={cn(
          "flex",
          props["aria-invalid"] &&
            "[&_*[data-slot=combobox-trigger]]:border-destructive [&_*[data-slot=combobox-trigger]]:ring-destructive/50",
          className,
        )}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        smartCaret={false}
        value={value || undefined}
        onChange={(value) => onChange?.(value || ("" as Value))}
        {...props}
      />
    </PhoneInputContext.Provider>
  );
}

function InputComponent({ className, ...props }: ComponentProps<typeof Input>) {
  const { variant } = use(PhoneInputContext);

  return (
    <Input
      className={cn(
        "rounded-s-none outline-none! ring-none! focus:z-1",
        variant === "sm" && "h-8",
        variant === "lg" && "h-10",
        className,
      )}
      {...props}
    />
  );
}

type CountryEntry = {
  label: string;
  value: Country | undefined;
};

type CountrySelectProps = {
  disabled?: boolean;
  value: Country;
  options: CountryEntry[];
  onChange: (country: Country) => void;
};

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) {
  const { variant, popupClassName } = use(PhoneInputContext);
  const [searchValue, setSearchValue] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchValue) return countryList;
    return countryList.filter(({ label }) =>
      label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [countryList, searchValue]);

  return (
    <Combobox
      items={filteredCountries}
      value={selectedCountry || ""}
      onValueChange={(country: Country | null) => {
        if (country) {
          onChange(country);
        }
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            size={variant}
            className={cn(
              "flex gap-1 rounded-s-md rounded-e-none border-e-0 px-2.5 py-0 leading-none shadow-black/5 shadow-xs hover:bg-transparent focus:z-10 data-pressed:bg-transparent",
              disabled && "opacity-50",
            )}
            disabled={disabled}
          >
            <span className="sr-only">
              <ComboboxValue />
            </span>
            <FlagComponent
              country={selectedCountry}
              countryName={selectedCountry}
            />
          </Button>
        }
      />
      <ComboboxContent
        className={cn(
          "w-xs *:data-[slot=input-group]:bg-transparent",
          popupClassName,
        )}
      >
        <ComboboxInput
          placeholder="e.g. United States"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          showTrigger={false}
          className="rounded-none border-0 border-input px-0 py-2.5 shadow-none outline-none! ring-0! focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <ComboboxSeparator />
        <ComboboxEmpty className="px-4 py-2.5 text-sm">
          No country found.
        </ComboboxEmpty>
        <ComboboxList>
          <div className="relative flex max-h-full">
            <div className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain">
              <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
                {filteredCountries.map((item: CountryEntry) =>
                  item.value ? (
                    <ComboboxItem
                      key={item.value}
                      value={item.value}
                      className="flex items-center gap-2"
                    >
                      <FlagComponent
                        country={item.value}
                        countryName={item.label}
                      />
                      <span className="flex-1 text-sm">{item.label}</span>
                      <span className="text-foreground/50 text-sm">
                        {`+${getCountryCallingCode(item.value)}`}
                      </span>
                    </ComboboxItem>
                  ) : null,
                )}
              </ScrollArea>
            </div>
          </div>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function FlagComponent({ country, countryName }: FlagProps) {
  const Flag = flags[country];

  return (
    <span className="flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-full! [&_svg:not([class*='size-'])]:rounded-[5px]">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <GlobeSimpleIcon className="size-4 opacity-60" />
      )}
    </span>
  );
}

export { PhoneInput };
