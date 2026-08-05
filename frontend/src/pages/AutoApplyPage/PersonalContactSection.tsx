import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import {
  useCandidateProfile,
  useUpsertCandidateProfile,
} from '@/features/auto-apply/hooks/useCandidateProfile';
import { useCurrentUser } from '@/features/user/hooks/useCurrentUser';
import { useUpdateUserProfile } from '@/features/user/hooks/useUpdateUserProfile';
import {
  Box,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
} from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';
import { useSetupDirty } from './SetupDirtyContext';
import {
  COUNTRY_OPTIONS,
  isValidE164Phone,
  joinFullName,
  splitFullName,
} from './setupFormUtils';

type FieldErrors = Partial<
  Record<'fullName' | 'phone' | 'currentLocation' | 'currentCountry', string>
>;

export function PersonalContactSection() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useCandidateProfile();
  const updateUser = useUpdateUserProfile();
  const upsertProfile = useUpsertCandidateProfile();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [locationSaveFailed, setLocationSaveFailed] = useState(false);

  const savedSnapshot = useMemo(
    () => ({
      fullName: joinFullName(user?.firstName, user?.lastName),
      phone: user?.phone ?? '',
      currentLocation: profile?.preferences.currentLocation ?? '',
      currentCountry: profile?.preferences.currentCountry ?? '',
    }),
    [profile?.preferences.currentCountry, profile?.preferences.currentLocation, user],
  );

  useEffect(() => {
    setFullName(savedSnapshot.fullName);
    setPhone(savedSnapshot.phone);
    setCurrentLocation(savedSnapshot.currentLocation);
    setCurrentCountry(savedSnapshot.currentCountry);
    setLocationSaveFailed(false);
  }, [savedSnapshot]);

  const isDirty =
    fullName !== savedSnapshot.fullName ||
    phone !== savedSnapshot.phone ||
    currentLocation !== savedSnapshot.currentLocation ||
    currentCountry !== savedSnapshot.currentCountry;

  useSetupDirty('personal', isDirty);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!fullName.trim()) {
      next.fullName = 'Enter your full name.';
    }
    if (!isValidE164Phone(phone)) {
      next.phone = 'Enter a valid phone number, e.g. +14155552671.';
    }
    if (!currentLocation.trim()) {
      next.currentLocation = 'Enter your current city or region.';
    }
    if (!currentCountry) {
      next.currentCountry = 'Select your country.';
    }
    return next;
  };

  const userFieldsChanged =
    fullName !== savedSnapshot.fullName || phone !== savedSnapshot.phone;
  const locationFieldsChanged =
    currentLocation !== savedSnapshot.currentLocation ||
    currentCountry !== savedSnapshot.currentCountry;

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const shouldSaveUser = userFieldsChanged || (!locationSaveFailed && locationFieldsChanged);
    const shouldSaveLocation = locationFieldsChanged || locationSaveFailed;

    if (!shouldSaveUser && !shouldSaveLocation) return;

    let userSaved = !shouldSaveUser;
    let locationSaved = !shouldSaveLocation;

    try {
      if (shouldSaveUser) {
        const { firstName, lastName } = splitFullName(fullName);
        await updateUser.mutateAsync({
          firstName,
          lastName,
          phone: phone.trim() ? phone.trim() : null,
        });
        userSaved = true;
      }
    } catch {
      showToast({ message: "We couldn't save your details. Try again.", severity: 'error' });
      return;
    }

    try {
      if (shouldSaveLocation) {
        await upsertProfile.mutateAsync({
          preferences: {
            currentLocation: currentLocation.trim(),
            currentCountry,
          },
        });
        locationSaved = true;
        setLocationSaveFailed(false);
      }
    } catch {
      setLocationSaveFailed(true);
      if (userSaved && shouldSaveUser) {
        showToast({
          message:
            "Your name and phone were saved, but we couldn't save your location. Try again.",
          severity: 'warning',
        });
      } else {
        showToast({ message: "We couldn't save your details. Try again.", severity: 'error' });
      }
      return;
    }

    if (userSaved && locationSaved) {
      showToast({ message: 'Personal details saved.', severity: 'success' });
    }
  };

  const isLoading = userLoading || profileLoading;
  const isSaving = updateUser.isPending || upsertProfile.isPending;

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, maxWidth: 640 }} variant="outlined">
        <SetupSectionHeading required sectionId="personal" title="Personal & contact details" />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton height={56} key={`personal-skeleton-${index}`} variant="rounded" />
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }} variant="outlined">
        <SetupSectionHeading required sectionId="personal" title="Personal & contact details" />
        <TextField
          error={Boolean(errors.fullName)}
          fullWidth
          helperText={errors.fullName}
          label="Full name"
          onChange={(event) => setFullName(event.target.value)}
          required
          value={fullName}
        />
        <TextField
          disabled
          fullWidth
          helperText="To change your email, go to Account settings."
          label="Email"
          value={user?.email ?? ''}
        />
        <TextField
          error={Boolean(errors.phone)}
          fullWidth
          helperText={
            errors.phone ??
            "Used only if an employer's application requires it. We never sell your data."
          }
          label="Phone number"
          onChange={(event) => setPhone(event.target.value)}
          value={phone}
        />
        <TextField
          error={Boolean(errors.currentLocation)}
          fullWidth
          helperText={
            errors.currentLocation ??
            'Used to check location eligibility for jobs that require you to be in a specific area.'
          }
          label="Current city or region"
          onChange={(event) => setCurrentLocation(event.target.value)}
          required
          value={currentLocation}
        />
        <TextField
          error={Boolean(errors.currentCountry)}
          fullWidth
          helperText={
            errors.currentCountry ??
            'Used to check location eligibility for jobs that require you to be in a specific area.'
          }
          label="Country"
          onChange={(event) => setCurrentCountry(event.target.value)}
          required
          select
          value={currentCountry}
        >
          <MenuItem value="">
            <em>Select country</em>
          </MenuItem>
          {COUNTRY_OPTIONS.map((country) => (
            <MenuItem key={country.code} value={country.code}>
              {country.label}
            </MenuItem>
          ))}
        </TextField>
        <Box>
          <Button disabled={!isDirty} isLoading={isSaving} onClick={() => void handleSave()}>
            Save
          </Button>
      </Box>
    </Paper>
  );
}
