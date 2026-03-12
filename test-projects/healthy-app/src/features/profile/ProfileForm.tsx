import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Grid,
  Select, MenuItem, InputLabel, FormControl, Alert, Snackbar
} from '@mui/material';
import { Save } from '@mui/icons-material';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  bio: string;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileData>;
  onSave: (data: ProfileData) => Promise<void>;
}

const ROLES = ['Developer', 'Designer', 'Product Manager', 'Engineering Manager', 'Other'];

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData = {}, onSave }) => {
  const [form, setForm] = useState<ProfileData>({
    firstName: initialData.firstName ?? '',
    lastName: initialData.lastName ?? '',
    email: initialData.email ?? '',
    role: initialData.role ?? '',
    bio: initialData.bio ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const handleChange = (field: keyof ProfileData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setSuccessOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" noValidate>
      <Typography variant="h6" fontWeight={700} mb={3}>
        Edit Profile
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="First Name"
            value={form.firstName}
            onChange={handleChange('firstName')}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={handleChange('lastName')}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={form.role} label="Role" onChange={handleChange('role')}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Bio"
            value={form.bio}
            onChange={handleChange('bio')}
            fullWidth
            multiline
            rows={4}
            inputProps={{ maxLength: 500 }}
            helperText={`${form.bio.length}/500`}
          />
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>
          Profile saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileForm;
