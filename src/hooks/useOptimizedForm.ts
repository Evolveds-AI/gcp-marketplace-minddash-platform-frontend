'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseOptimizedFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export function useOptimizedForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseOptimizedFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation function
  const validateForm = useCallback((formValues: T) => {
    if (!validate) return {};
    return validate(formValues);
  }, [validate]);

  // Optimized field change handler
  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  // Handle field blur for validation
  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validate) {
      const fieldErrors = validate(values);
      if (fieldErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
      }
    }
  }, [validate, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setIsSubmitting(true);
    
    // Validate all fields
    const formErrors = validateForm(values);
    setErrors(formErrors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Partial<Record<keyof T, boolean>>);
    setTouched(allTouched);

    // If no errors, submit the form
    if (Object.keys(formErrors).length === 0 && onSubmit) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [values, validateForm, onSubmit]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set specific field value
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set multiple field values
  const setFieldValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // Check if form is valid
  const isValid = useMemo(() => {
    const formErrors = validateForm(values);
    return Object.keys(formErrors).length === 0;
  }, [values, validateForm]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((name: keyof T) => {
    return {
      name: name as string,
      value: values[name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : e.target.value;
        handleChange(name, value);
      },
      onBlur: () => handleBlur(name),
      error: touched[name] ? errors[name] : undefined
    };
  }, [values, errors, touched, handleChange, handleBlur]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldValues,
    getFieldProps
  };
}

// Hook for debounced values to optimize API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  });

  return debouncedValue;
}