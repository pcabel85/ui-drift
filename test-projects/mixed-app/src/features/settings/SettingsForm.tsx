import React, { useState } from 'react';
import { TextField, Switch, FormControlLabel, Typography, Box, Divider, Alert } from '@mui/material';
import { Save } from '@mui/icons-material';
import Button from '../../components/Button';
import PrimaryButton from '../../shared/PrimaryButton';

interface SettingsFormProps {
  onSave: (settings: Record<string, any>) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ onSave }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ displayName, email, notifications, darkMode });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Typography variant="h6" fontWeight={700}>Account Settings</Typography>

      {saved && <Alert severity="success">Settings saved successfully!</Alert>}

      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Profile</Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} size="small" fullWidth />
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} size="small" fullWidth />
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Preferences</Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <FormControlLabel
            control={<Switch checked={notifications} onChange={e => setNotifications(e.target.checked)} color="primary" />}
            label="Email notifications"
          />
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />}
            label="Dark mode"
          />
        </Box>
      </Box>

      <Divider />

      {/* Inconsistency: uses PrimaryButton here instead of the MUI-backed Button */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button variant="outlined">Discard</Button>
        <PrimaryButton onClick={handleSave}>Save Settings</PrimaryButton>
      </Box>
    </Box>
  );
};

export default SettingsForm;
