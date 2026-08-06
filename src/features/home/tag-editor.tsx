'use client';

import { Field } from '@base-ui/react/field';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { CircleCheck, X } from 'lucide-react';
import { useId, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Controller, useForm } from 'react-hook-form';

import Button from '../../components/button';
import { normalizeTagColor, tagPalette } from './tag-colors';
import { tagColorSchema, tagSchema } from './tag-schemas';
import type { TagFormValues } from './tag-schemas';

import buttonStyles from '../../components/button.module.css';
import formStyles from '../../components/modal-form-layout.module.css';
import inputStyles from './task-form.module.css';
import styles from './tag.module.css';

const customColorDefault = '#334155';
const defaultTagValue: TagFormValues = { color: tagPalette[4], name: '' };
const iconSize = 20;

interface TagEditorProps {
  initialValue?: TagFormValues;
  onCancel: () => void;
  onSave: (values: TagFormValues) => void | Promise<void>;
  pending: boolean;
  saveLabel: string;
}

export default function TagEditor({
  initialValue = defaultTagValue,
  onCancel,
  onSave,
  pending,
  saveLabel,
}: TagEditorProps) {
  const colorLabelId = useId();
  const initialCustomColor = tagPalette.includes(initialValue.color as (typeof tagPalette)[number])
    ? customColorDefault
    : initialValue.color;
  const [customColor, setCustomColor] = useState(initialCustomColor);
  const {
    control,
    formState: { isValid },
    handleSubmit,
  } = useForm<TagFormValues>({
    defaultValues: initialValue,
    mode: 'onChange',
    resolver: zodResolver(tagSchema),
  });

  return (
    <form className={styles.editor} noValidate onSubmit={handleSubmit(onSave)}>
      <Controller
        control={control}
        name="name"
        render={({
          field: { name, onBlur, onChange, ref, value },
          fieldState: { error, invalid, isDirty, isTouched },
        }) => (
          <Field.Root
            className={formStyles.formControl}
            dirty={isDirty}
            invalid={invalid}
            name={name}
            touched={isTouched}
          >
            <Field.Label className={formStyles.label}>Name</Field.Label>
            <Field.Control
              autoComplete="off"
              className={inputStyles.input}
              maxLength={32}
              onBlur={onBlur}
              onValueChange={(nextValue) => onChange(nextValue.toLowerCase())}
              ref={ref}
              type="text"
              value={value}
            />
            <Field.Error aria-live="polite" className={formStyles.error} match>
              {error?.message ?? ''}
            </Field.Error>
          </Field.Root>
        )}
      />
      <Controller
        control={control}
        name="color"
        render={({
          field: { name, onBlur, onChange, ref, value },
          fieldState: { error, invalid, isDirty, isTouched },
        }) => {
          const parsedColor = tagColorSchema.safeParse(value);
          const selectedColor = tagPalette.includes(value as (typeof tagPalette)[number])
            ? value
            : 'custom';

          return (
            <div className={styles.colorField}>
              <RadioGroup
                aria-labelledby={colorLabelId}
                className={styles.palette}
                onValueChange={(nextColor) =>
                  onChange(nextColor === 'custom' ? customColor : nextColor)
                }
                value={selectedColor}
              >
                <span className={formStyles.label} id={colorLabelId}>
                  Color
                </span>
                <div className={styles.paletteOptions}>
                  {tagPalette.map((color) => (
                    <Radio.Root
                      aria-label={color}
                      className={styles.paletteRadio}
                      key={color}
                      style={{ backgroundColor: color }}
                      value={color}
                    >
                      <Radio.Indicator className={styles.paletteIndicator} />
                    </Radio.Root>
                  ))}
                  <Radio.Root className={styles.customOption} value="custom">
                    <span className={styles.customRadioShell}>
                      <Radio.Indicator className={styles.customIndicator} />
                    </span>
                    Custom
                  </Radio.Root>
                </div>
              </RadioGroup>
              {selectedColor === 'custom' ? (
                <HexColorPicker
                  aria-label="Custom tag color"
                  className={styles.colorPicker}
                  color={parsedColor.success ? parsedColor.data : customColor}
                  onChange={(nextColor) => {
                    const normalizedColor = normalizeTagColor(nextColor);

                    setCustomColor(normalizedColor);
                    onChange(normalizedColor);
                  }}
                />
              ) : null}
              <Field.Root
                className={formStyles.formControl}
                dirty={isDirty}
                invalid={invalid}
                name={name}
                touched={isTouched}
              >
                <Field.Label className={formStyles.label}>Hex color</Field.Label>
                <Field.Control
                  autoComplete="off"
                  className={inputStyles.input}
                  maxLength={7}
                  onBlur={onBlur}
                  onValueChange={(nextValue) => {
                    const normalizedValue = nextValue.toLowerCase();
                    const parsedValue = tagColorSchema.safeParse(normalizedValue);

                    onChange(normalizedValue);
                    if (parsedValue.success) {
                      setCustomColor(parsedValue.data);
                    }
                  }}
                  ref={ref}
                  spellCheck={false}
                  type="text"
                  value={value}
                />
                <Field.Error aria-live="polite" className={formStyles.error} match>
                  {error?.message ?? ''}
                </Field.Error>
              </Field.Root>
            </div>
          );
        }}
      />
      <div className={styles.editorActions}>
        <button
          className={clsx(
            buttonStyles.button,
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.neutral,
          )}
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          <span className={buttonStyles.buttonTop}>
            <X size={iconSize} />
            Cancel
          </span>
        </button>
        <Button
          disabled={!isValid}
          icon={<CircleCheck size={iconSize} />}
          loading={pending}
          styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
          text={saveLabel}
          type="submit"
        />
      </div>
    </form>
  );
}
