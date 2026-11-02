import { Button, FieldError, Input, Label, TextField } from "heroui-native";
import type { ComponentProps } from "react";
import { View } from "react-native";

type SaveableTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error: string | null;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
} & Pick<
  ComponentProps<typeof Input>,
  "placeholder" | "keyboardType" | "autoComplete" | "textContentType"
>;

/** Text field with its own "Guardar" button, enabled only after a change. */
export function SaveableTextField({
  label,
  value,
  onChangeText,
  error,
  isDirty,
  isSaving,
  onSave,
  ...inputProps
}: SaveableTextFieldProps) {
  return (
    <TextField isInvalid={error !== null}>
      <Label>{label}</Label>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={isDirty ? onSave : undefined}
            returnKeyType="done"
            {...inputProps}
          />
        </View>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={!isDirty || isSaving}
          onPress={onSave}
        >
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </View>
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
