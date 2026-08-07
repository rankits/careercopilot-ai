import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import { useToast } from '@/components/organisms/Toast/ToastContext';

import { resumeService } from '@/features/resume/services/resume.service';
import { AddIcon, Box, Chip, CircularProgress, Paper, TextField, Typography } from '@/lib/material';

import { SetupSectionHeading } from './SetupSectionHeading';

interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  location: string;
}

interface CertificationItem {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  credentialUrl: string;
}

const emptyEducation = (): EducationItem => ({
  degree: '',
  endYear: '',
  field: '',
  institution: '',
  location: '',
  startYear: '',
});
const emptyCertification = (): CertificationItem => ({
  credentialUrl: '',
  expiryDate: '',
  issueDate: '',
  issuer: '',
  name: '',
});
const text = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
};

export function EducationSection() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profileQuery = useQuery({
    queryFn: () => resumeService.getMyProfile(),
    queryKey: ['resume-profile', 'me'],
  });
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

  useEffect(() => {
    setEducation(
      (profileQuery.data?.education ?? []).map((item) => ({
        degree: text(item, 'degree'),
        endYear: text(item, 'endYear', 'endDate'),
        field: text(item, 'field', 'fieldOfStudy'),
        institution: text(item, 'institution', 'school', 'schoolName'),
        location: text(item, 'location'),
        startYear: text(item, 'startYear', 'startDate'),
      })),
    );
    setCertifications(
      (profileQuery.data?.certifications ?? []).map((item) => ({
        credentialUrl: text(item, 'credentialUrl', 'url'),
        expiryDate: text(item, 'expiryDate'),
        issueDate: text(item, 'issueDate'),
        issuer: text(item, 'issuer', 'issuingOrganization'),
        name: text(item, 'name', 'title'),
      })),
    );
  }, [profileQuery.data]);

  const payload = useMemo(
    () => ({
      certifications: certifications.map((item) => ({ ...item })),
      education: education.map((item) => ({ ...item })),
    }),
    [certifications, education],
  );

  const save = useMutation({
    mutationFn: () => resumeService.updateProfile(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['resume-profile', 'me'] });
      showToast({ message: 'Education and certifications saved.', severity: 'success' });
    },
    onError: () => showToast({ message: 'Unable to save education.', severity: 'error' }),
  });

  if (profileQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const updateEducation = (index: number, field: keyof EducationItem, value: string) =>
    setEducation((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  const updateCertification = (index: number, field: keyof CertificationItem, value: string) =>
    setCertifications((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );

  return (
    <Box id="setup-section-education" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: { xs: 2, sm: 3 } }} variant="outlined">
        <Box sx={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
          <SetupSectionHeading
            helperText="Add your academic background in reverse chronological order."
            required={false}
            sectionId="education"
            title="Education"
          />
          <Button
            onClick={() => setEducation((items) => [...items, emptyEducation()])}
            size="small"
          >
            <AddIcon sx={{ fontSize: 16, mr: 0.5 }} /> Add education
          </Button>
        </Box>
        {education.map((item, index) => (
          <Box
            key={`education-${index}`}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              mb: 1.5,
              p: 2,
            }}
          >
            <TextField
              label="School / University"
              onChange={(e) => updateEducation(index, 'institution', e.target.value)}
              sx={{ gridColumn: { sm: 'span 2' } }}
              value={item.institution}
            />
            <TextField
              label="Degree"
              onChange={(e) => updateEducation(index, 'degree', e.target.value)}
              sx={{ gridColumn: { sm: 'span 2' } }}
              value={item.degree}
            />
            <TextField
              label="Field of study"
              onChange={(e) => updateEducation(index, 'field', e.target.value)}
              sx={{ gridColumn: { sm: 'span 2' } }}
              value={item.field}
            />
            <TextField
              label="Start year"
              onChange={(e) => updateEducation(index, 'startYear', e.target.value)}
              value={item.startYear}
            />
            <TextField
              label="End year"
              onChange={(e) => updateEducation(index, 'endYear', e.target.value)}
              value={item.endYear}
            />
            <TextField
              label="Location"
              onChange={(e) => updateEducation(index, 'location', e.target.value)}
              sx={{ gridColumn: '1 / -1' }}
              value={item.location}
            />
          </Box>
        ))}
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 } }} variant="outlined">
        <Box sx={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
              <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
                Certifications & courses
              </Typography>
              <Chip label="Optional" size="small" />
            </Box>
            <Typography color="text.secondary" variant="body2">
              Add relevant certifications, licenses, or professional courses.
            </Typography>
          </Box>
          <Button
            onClick={() => setCertifications((items) => [...items, emptyCertification()])}
            size="small"
          >
            <AddIcon sx={{ fontSize: 16, mr: 0.5 }} /> Add certification
          </Button>
        </Box>
        {certifications.map((item, index) => (
          <Box
            key={`cert-${index}`}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              mb: 1.5,
              p: 2,
            }}
          >
            <TextField
              label="Certificate name"
              onChange={(e) => updateCertification(index, 'name', e.target.value)}
              value={item.name}
            />
            <TextField
              label="Issuing organization"
              onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
              value={item.issuer}
            />
            <TextField
              label="Issue date"
              onChange={(e) => updateCertification(index, 'issueDate', e.target.value)}
              value={item.issueDate}
            />
            <TextField
              label="Expiry date"
              onChange={(e) => updateCertification(index, 'expiryDate', e.target.value)}
              value={item.expiryDate}
            />
            <TextField
              label="Credential URL"
              onChange={(e) => updateCertification(index, 'credentialUrl', e.target.value)}
              sx={{ gridColumn: '1 / -1' }}
              value={item.credentialUrl}
            />
          </Box>
        ))}
        <Button isLoading={save.isPending} onClick={() => save.mutate()}>
          Save education
        </Button>
      </Paper>
    </Box>
  );
}
